// @ts-check
"use strict";

/**
 * MFRC522 SPI test
 * Read the version number and Perform self test
 * Read 4, 7 and 10 byte UIDs from Mifare tags
 *
 * To run:
 * node run.js
 *
 * Optional flags:
 *
 * --speed : The default max speed of the SPI clock
 * is 10Mhz.
 * This can be changed with with--speed=<number>
 * E.g. --speed=1_000_000 gives 1Mhz max clock speed
 *
 * --device The default device is /dev/spidev0.0
 * Select another e.g --device=/dev/spidev0.1
 *
 * --no-self-test : To disable the self test. If
 * your MFRC522 is a clone the self test may fail.
 * In that case it is useful to disable the self test.
 *
 * --help, -h : Show this help message
 *
 * Based on https://github.com/miguelbalboa/rfid
 * And https://github.com/firsttris/mfrc522-rpi
 * The NXP MFRC522 data sheet:
 * https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf
 */

import SPIDevice from '@eeemarv/io-spi';
import { setTimeout } from 'timers/promises';
import { PCD_Cmd } from './data/pcd_command.js';
import { PCD_Reg } from './data/pcd_reg.js';
import { PICC_Cmd } from './data/picc_command.js';
import { PCD_Test } from './data/pcd_self_test.js';

let spi;

/**
 * @param {number} test
 * @returns {void}
 */
const testByte = (test) => {
  if (!Number.isInteger(test)){
    throw new TypeError(`Error, not an integer ${JSON.stringify(test)}`);
  }
  if (test > 255){
    throw new RangeError(`Error out of range: ${JSON.stringify(test)}`);
  }
  if (test < 0){
    throw new RangeError(`Error out of range: ${JSON.stringify(test)}`);
  }
};

/**
 * @param {number} addr
 * @returns {number}
 */
const getReadAddr = (addr) => {
  return ((addr << 1) & 0x7e) | 0x80;
};

/**
 * @param {number} addr
 * @returns {number}
 */
const getWriteAddr = (addr) => {
  return (addr << 1) & 0x7e;
};

/**
 * Read from the MFRC522
 * @param {number[]} addrAry registers to read
 * @returns {Promise<number[]>} values of the registers
 */
const read = async (addrAry) => {
  if (!Array.isArray(addrAry)){
    throw new TypeError(`addrAry is not an array: ${JSON.stringify(addrAry)}`);
  }
  if (!addrAry.length){
    throw new RangeError('read addrAry is empty');
  }
  for (const addr of addrAry){
    testByte(addr);
  }
  const [rxBuf] = await spi.transfer([
    Buffer.from([
      ...addrAry.map((addr) => getReadAddr(addr)),
      0x00
    ])
  ]);
  return [...rxBuf].slice(1); // Skip 1 byte
};

/**
 * Write to the MFRC522
 * The first element in each nested array is
 * the register address to write to,
 * the following byte(s) the data
 * @param {number[][]} writeAry
 * @returns {Promise<void>}
 */
const write = async (writeAry) => {
  if (!Array.isArray(writeAry)){
    throw new TypeError(`writeAry is not an array: ${JSON.stringify(writeAry)}`);
  }
  if (!writeAry.length){
    throw new RangeError('writeAry is empty');
  }
  for (const subAry of writeAry){
    if (!Array.isArray(subAry)){
      throw new TypeError(`write subAry is not an array: ${JSON.stringify(subAry)}`)
    }
    if (!subAry.length){
      throw new RangeError('write subAry is empty');
    }
    if (subAry.length < 2){
      throw new RangeError(`write subAry needs a least two elements, an address and register: ${JSON.stringify(subAry)}`);
    }
    for (const test of subAry){
      testByte(test);
    }
  }
  const lastWr = writeAry.pop();
  await spi.transfer([
    ...writeAry.map((wr) => { return {
      tx_buf: Buffer.from([getWriteAddr(wr[0]), ...wr.slice(1)]),
      cs_change: 1
    }}),
    // @ts-ignore
    Buffer.from([getWriteAddr(lastWr[0]), ...lastWr.slice(1)])
  ]);
};

/**
 * Set bits in a register of the MFRC522
 * @param {number} addr
 * @param {number} bitMask
 * @returns {Promise<void>}
 */
const setBitMask = async (addr, bitMask) => {
  if (!bitMask){
    return;
  }
  const [value] = await read([addr]);
  const newValue = value | bitMask;
  if (value == newValue){
    return;
  }
  await write([[addr, newValue]]);
};

/**
 * Clear bits in a register of the MFRC522
 * @param {number} addr
 * @param {number} bitMask
 * @returns {Promise<void>}
 */
const clearBitMask = async (addr, bitMask) => {
  if (!bitMask){
    return;
  }
  const [value] = await read([addr]);
  const newValue = value & ~bitMask;
  if (value == newValue){
    return;
  }
  await write([[addr, newValue]]);
};

/**
 * Soft Reset the MFRC522
 * @returns {Promise<void>}
 */
const reset = async () => {
  await write([[PCD_Reg.Command, PCD_Cmd.SoftReset]]);
  await setTimeout(50);
};

/**
 * Run the Self test (for digital integrety) of the MFRC522
 * @returns {Promise<void>}
 */
const selfTest = async () => {
  const [version] = await read([PCD_Reg.Version]);
  console.log(`MFRC522 Version: \x1b[1;33m0x${version.toString(16)}\x1b[0m`);

  if (version !== 0x92 && version !== 0x91 && version !== 0x90) {
    throw new Error('Failed to initialize MFRC522 - wrong version');
  }

  await write([[PCD_Reg.Command, PCD_Cmd.SoftReset]]);
  await setTimeout(50);

  await write([
    [PCD_Reg.Command, PCD_Cmd.Idle],
    // flush FIFO
    [PCD_Reg.FIFOLevel, 0x80],
    // write 25x 0x00 to FIFO
    [PCD_Reg.FIFOData, ...new Array(25).fill(0x00)],
    // Copy 0x00's to internal memory
    [PCD_Reg.Command, PCD_Cmd.Mem],
    // stop
    [PCD_Reg.Command, PCD_Cmd.Idle],
    // flush FIFO
    [PCD_Reg.FIFOLevel, 0x80],
    // enable self test
    [PCD_Reg.AutoTest, 0x09],
    // write 0x00 to FIFO
    [PCD_Reg.FIFOData, 0x00],
    // Calc CRC
    [PCD_Reg.Command, PCD_Cmd.CalcCRC],
  ]);

  // Wait for CRCIRq
  for(let i = 0; i < 100; i++) {
    await setTimeout(1);
    const [irq] = await read([PCD_Reg.DivIrq]); // DivIrqReg
    if (irq & 0x04) break;
  }

  // Read FIFO to get test result
  const result = await read(new Array(64).fill(PCD_Reg.FIFOData));

  console.log('Self test data:');
  for (let a = 0; a < 8; a++){
    let str = '\x1b[32m';
    for (let b = 0; b < 8; b++){
      str += result[(a * 8) + b].toString(16).padStart(2, '0');
      str += ' ';
    }
    console.log(str + '\x1b[0m');
  }

  await write([[PCD_Reg.AutoTest, 0x00]]);

  // Compare with the expected result
  for (const prop in PCD_Test){
    if (version != PCD_Test[prop].version){
      continue;
    }
    const expected = PCD_Test[prop].data;
    const ok = expected.every((val, i) => val === result[i]);
    if (ok){
      console.log('Expected data matches for Self test.');
    } else {
      throw new Error('MFRC522 self-test failed: output does not match reference pattern.');
    }
  }

  // Check if RF can be turned on
  await setBitMask(PCD_Reg.TxControl, 0x03); // enable antenna drivers
  const [txControl] = await read([PCD_Reg.TxControl]);
  if ((txControl & 0x03) == 0x03) {
    console.log('Able to turn on antenna.');
  } else {
    throw new Error('Failed to enable antenna (TxControlReg)');
  }

  console.log('MFRC522 Self test completed.');
};

/**
 * Init the MFRC522 for transmission
 * @returns {Promise<void>}
 */
const initRegs = async () => {
  // antenna on
  await setBitMask(PCD_Reg.TxControl, 0x03);

  await write([
    // 106 kbit/s type A (default)
    [PCD_Reg.TxMode, 0x00],
    [PCD_Reg.RxMode, 0x00],
    // reset modwidth
    [PCD_Reg.ModWidth, 0x26],
    // Timer: TAuto=1; timer starts automatically at transmission end
    // TAuto=1, timer prescaler
    [PCD_Reg.TMode, 0x8d],
    // 40kHz
    [PCD_Reg.TPrescaler, 0x3e],
    // 25ms before timeout
    [PCD_Reg.TReloadH, 0x00],
    [PCD_Reg.TReloadL, 0x1e],
    // force 100% ASK modulation
    [PCD_Reg.TxASK, 0x40],
    // preset 0x6363 fpr CRC
    [PCD_Reg.Mode, 0x3d],
  ]);
};

/**
 * Show the help message
 * @returns {void}
 */
const showHelp = () => {
  console.log(`
Usage: node examples/mfrc522.js [options]

This script initializes the MFRC522 RFID reader and performs a self-test.
It reads UIDs from Mifare tags and displays them in hexadecimal format.

Options:
  --speed=<number>, -s=<number>    Set the maximum clock speed in Hz. Default is 10_000_000 (10MHz).
  --device=<path>, -d=<path>       Set the SPI device path. Default is /dev/spidev0.0.
  --no-self-test, -n               Disable the self-test. Useful if your MFRC522 is a clone.
  --help, -h                       Show this help message.
`);
};

/**
 * Initialize communication with the MFRC522
 * @return {Promise<void>}
 */
const init = async () => {
  let speed = 10_000_000;
  let device = '/dev/spidev0.0';
  let selfTestEnabled = true;
  let skipArg = false;

  const args = process.argv.slice(2);

  try {
    args.forEach((arg, i) => {
      let key = undefined;
      let value = undefined;

      if (skipArg) {
        skipArg = false;
        return;
      }

      if (arg.includes('=')) {
        // If the argument is in the form --key=value, we can skip the next argument
        [key, value] = arg.split('=');
      } else {
        // If the argument is in the form --key value, we need to check the next argument
        key = arg;
        value = args[i + 1];
        skipArg = true; // Skip the next argument since it's the value for this key
      }
      if (key === '--speed' || key === '-s') {
        if (!value) {
          throw new Error('Missing value for --speed');
        }
        speed = Number(value.replace(/_/g, ''));
        if (isNaN(speed) || speed <= 0) {
          throw new Error(`Invalid speed value: ${value}`);
        }
        return;
      }
      if (key === '--device' || key === '-d') {
        if (!value) {
          throw new Error('Missing value for --device');
        }
        device = value;
        if (typeof device !== 'string' || !device.startsWith('/dev/spidev')) {
          throw new Error(`Invalid device path: ${device}`);
        }
        return;
      }
      if (key === '--no-self-test' || key === '-n') {
        selfTestEnabled = false;
        return;
      }
      if (key === '--help' || key === '-h') {
        showHelp();
        process.exit(0);
      }

      throw new Error(`Unknown argument: ${arg}`);
    });
  } catch (err) {
    console.error('\x1b[1;31mError parsing arguments:\x1b[0m', err.message);
    showHelp();
    process.exit(1);
  }

  spi = new SPIDevice(device, {
    max_speed_hz: speed
  });

  try {
    console.log(`SPI device: \x1b[1;33m${device}\x1b[0m`);
    console.log(`SPI max speed Hz: \x1b[1;33m${spi.getMaxSpeedHz()}\x1b[0m`);
    console.log(`SPI Mode: \x1b[1;33m${spi.getMode()}\x1b[0m`);
    console.log(`SPI bits per word: \x1b[1;33m${spi.getBitsPerWord()}\x1b[0m`);

    if (selfTestEnabled){
      await reset();
      await selfTest();
    }

    await reset();
    await initRegs();

    console.log('\x1b[1;32mMFRC522 initialized successfully\x1b[0m');
  } catch (err) {
    console.error('\x1b[1;31mMFRC522 initialization failed\x1b[0m:', err);
    throw err;
  }

  console.log('Ready to read UIDs from tags. Press Ctrl-C to exit.');
};

/**
 * Communicate with a tag through the MFRC522
 * @param {number[]} dataAry - sent to the card
 * @returns {Promise<{success: boolean, data: number[], bitSize: number}>}
 */
const transeive = async (dataAry) => {

  const [comIrq1, fifoLevel1, bitFraming1] = await read([
    PCD_Reg.ComIrq,
    PCD_Reg.FIFOLevel,
    PCD_Reg.BitFraming,
  ]);

  await write([
    // interrupt request enabled
    [PCD_Reg.ComIEn, 0xf7],
    // clear all interupt requests
    [PCD_Reg.ComIrq, comIrq1 & 0x7f],
    // flush FIFO
    [PCD_Reg.FIFOLevel, fifoLevel1 | 0x80],
    // Stop calculating CRC for new data in the FIFO
    [PCD_Reg.Command, PCD_Cmd.Idle],
    // data to FIFO
    [PCD_Reg.FIFOData, ...dataAry],
    // Transeive
    [PCD_Reg.Command, PCD_Cmd.Transceive],
    // start send
    [PCD_Reg.BitFraming, bitFraming1 | 0x80],
  ]);

  //Wait for the received data to complete
  let irq = 0;
  let timeout = true;

  for (let i = 0; i < 8; i++){
    await setTimeout(3);
    [irq] = await read([PCD_Reg.ComIrq]);
    if (!(irq & 0x01)){
      timeout = false;
      break;
    }
    if (!(irq & 0x30)){ // WaitIRq
      timeout = false;
      break;
    }
  }

  // start send = 0
  await clearBitMask(PCD_Reg.BitFraming, 0x80);

  if (timeout){
    return {success: false, data: [], bitSize: 0};
  }

  const [
    error,
    fifoLevel,
    control
  ] = await read([
    PCD_Reg.Error,
    PCD_Reg.FIFOLevel,
    PCD_Reg.Control
  ]);

  if (error & 0x1b){
    return {success: false, data: [], bitSize: 0};
  }

  let success = true;
  let bitSize;

  if (irq & 0x01) {
    success = false;
  }

  let byteSize = fifoLevel;
  let lastBits = control & 0x07;

  if (lastBits) {
    bitSize = (byteSize - 1) * 8 + lastBits;
  } else {
    bitSize = byteSize * 8;
  }

  if (byteSize == 0) {
    byteSize = 1;
  }

  if (byteSize > 16) {
    byteSize = 16;
  }

  // Read data from FIFO
  const data = await read(new Array(byteSize).fill(PCD_Reg.FIFOData));

  return { success, data, bitSize };
};

/**
 * Detect if a tag is present in the antenna field
 * @returns {Promise<boolean>} card detected
 */
const detect = async () => {
  await write([[PCD_Reg.BitFraming, 0x07]]);
  const {success, data, bitSize} = await transeive([PICC_Cmd.REQA]);

  if (!success){
    return false;;
  }
  if (bitSize != 0x10) {
    return false;
  }
  if (data.length != 2){
    return false;
  }

  return true;
};

/**
 * Calculate a CRC on the co-processor of the MFRC522
 * @param {number[]} dataAry
 * @returns {Promise<void|number[]>}
 */
const calcCRC = async (dataAry) => {
  // Clear the CRCIRq interrupt request bit
  await clearBitMask(PCD_Reg.DivIrq, 0x04);
  // Flush FIFO
  await setBitMask(PCD_Reg.FIFOLevel, 0x80);
  // data to FIFO and execute CalcCRC
  await write([
    [PCD_Reg.FIFOData, ...dataAry],
    [PCD_Reg.Command, PCD_Cmd.CalcCRC],
  ]);

  for (let i = 0; i < 1000; i++){
    const [irq] = await read([PCD_Reg.DivIrq]);
    if (irq & 0x04){
      return await read([
        PCD_Reg.CRCResultL, PCD_Reg.CRCResultH,
      ]);
    }
  }
};

/**
 * Select anticollision for cascade leveland
 * get SAK (select acknowledge) from a tag
 * @param {number} level
 * @returns {Promise<void|number[]>}
 */
const cascade = async (level) => {
  if (![1, 2, 3].includes(level)){
    throw new RangeError(`level must be 1, 2 or 3, current: ${level}`);
  }
  const cmd = [
    PICC_Cmd.SEL_CL1,
    PICC_Cmd.SEL_CL2,
    PICC_Cmd.SEL_CL3,
  ][level - 1];
  const cas1 = [cmd, 0x20];
  for (let i = 0; i < 5; i++){
    if (!i){
      await setTimeout(2);
    }
    await write([[PCD_Reg.BitFraming, 0x00]]);
    const {success, data, bitSize} = await transeive(cas1);
    if (!success){
      continue;
    }
    if (bitSize != 40){
      continue;
    }
    // Check BCC (data[4])
    if ((data[0] ^ data[1] ^ data[2] ^ data[3]) != data[4]){
      continue;
    }
    return data;
  }
};

/**
 * Return a 4, 7 or 10 byte UID
 * from a tag in the antenna field
 * @returns {Promise<void|number[]>}
 */
const getUid = async () => {
  const uid1 = await cascade(1);
  if (!Array.isArray(uid1)){
    return;
  }

  const sak1Req = [
    PICC_Cmd.SEL_CL1, 0x70, ...uid1
  ];
  const crc1 = await calcCRC(sak1Req);
  if (!Array.isArray(crc1)){
    console.log('\x1b[1;35mCRC1 failed\x1b[0m');
    return;
  }
  const sak1 = await transeive([...sak1Req, ...crc1]);
  if (!sak1.success){
    console.log('\x1b[1;35mSAK1 no success\x1b[0m');
    return;
  }
  if (!(sak1.data[0] & 0x04)){
    if (uid1[0] == 0x88){
      // error, indicates uid is longer
      return;
    }
    // UID 4 bytes
    return [...uid1.slice(0, 4)];
  }
  if (uid1[0] != 0x88){
    // error, not valid for next level
    return;
  }
  const uid2 = await cascade(2);
  if (!Array.isArray(uid2)){
    return;
  }
  const sak2Req = [
    PICC_Cmd.SEL_CL2, 0x70, ...uid2
  ];
  const crc2 = await calcCRC(sak2Req);
  if (!Array.isArray(crc2)){
    console.log('\x1b[1;35mCRC2 failed\x1b[0m');
    return;
  }
  const sak2 = await transeive([...sak2Req, ...crc2]);
  if (!sak2.success){
    console.log('\x1b[1;35mSAK2 no success\x1b[0m');
    return;
  }
  if (!(sak2.data[0] & 0x04)){
    if (uid2[0] == 0x88){
      // error, indicates uid is longer
      return;
    }
    // UID 7 bytes
    return [...uid1.slice(1, 4), ...uid2.slice(0, 4)];
  }
  if (uid2[0] != 0x88){
    // error, not valid for next level
    return;
  }
  const uid3 = await cascade(3);
  if (!Array.isArray(uid3)){
    return;
  }
  const sak3Req = [
    PICC_Cmd.SEL_CL3, 0x70, ...uid3
  ];
  const crc3 = await calcCRC(sak3Req);
  if (!Array.isArray(crc3)){
    console.log('\x1b[1;35mCRC3 failed\x1b[0m');
    return;
  }
  const sak3 = await transeive([...sak3Req, ...crc3]);
  if (!sak3.success){
    console.log('\x1b[1;35mSAK3 no success\x1b[0m');
    return;
  }
  // UID 10 bytes
  return [...uid1.slice(1, 4), ...uid2.slice(1, 4), ...uid3.slice(0, 4)];
};

/**
 * Main program
 */
(async () => {
  let busy = false;
  let readCount = 0;
  let errorCount = 0;
  await init();

  // scan loop
  setInterval(async () => {
    if (busy){
      console.log('\x1b[36m..reader busy, skip loop\x1b[0m');
      return;
    }
    busy = true;

    try {
      await write([[PCD_Reg.Command, PCD_Cmd.SoftReset]]);
      await initRegs();

      const detected = await detect();

      if (!detected){
        return;
      }

      const uid = await getUid();

      if (Array.isArray(uid)){
        let uidStr = '';
        for(const b of uid){
          uidStr += b.toString(16).padStart(2, '0');
        }
        readCount++;
        console.log(`Tag UID: \x1b[1;32m${uidStr}\x1b[0m, read count: \x1b[1;33m${readCount}\x1b[0m`);
      } else {
        errorCount++;
        console.log(`Error count \x1b[1;31m${errorCount}\x1b[0m`);
      }

    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      // antenna off
      await clearBitMask(PCD_Reg.TxControl, 0x03);
      busy = false;
    }
  }, 50);
})();
