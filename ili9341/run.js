// @ts-check
"use strict";

/*
  * Example of using the ILI9341 display with SPI on Linux.
  * This example generates a Mandelbrot fractal image and displays it on the ILI9341 screen.
  * It uses the `node-libgpiod` library for GPIO control and `@eeemarv/io-spi` for SPI communication.
  *
 */

import SPIDevice from '@eeemarv/io-spi';
import { Chip, Line } from 'node-libgpiod';
import { setTimeout } from 'timers/promises';

const WIDTH = 240;
const HEIGHT = 320;

let spi;
let dc;
let reset;
let chip;
let frames = 1; // Default number of frames to render

/**
 * Send a command to the ILI9341 display.
 * @param {number} cmd
 */
const sendCommand = async (cmd) => {
  dc.setValue(0); // Command mode
  await spi.transfer([Buffer.from([cmd])]);
};

/**
 * Send data to the ILI9341 display.
 * @param {Buffer|Buffer[]} data
 */
const sendData = async (data) => {
  dc.setValue(1); // Data mode
  if (Array.isArray(data)) {
    await spi.transfer(data);
    return;
  }
  await spi.transfer([data]);
};

/**
 * Send an array of data to the ILI9341 display.
 * @param {number[]} dataArray
 */
const sendDataArray = async (dataArray) => {
  await sendData(Buffer.from(dataArray));
};

// Initialize ILI9341 display
/**
 * Initialize the ILI9341 display with default settings.
 * @returns {Promise<void>}
 */
const initILI9341 = async () => {
  // Hardware reset
  reset.setValue(0);
  await setTimeout(50);
  reset.setValue(1);
  await setTimeout(120);

  // Exit sleep
  await sendCommand(0x11);
  await setTimeout(120);

  // Pixel format: 16 bits per pixel (RGB565)
  await sendCommand(0x3A);
  await sendDataArray([0x55]);

  // Memory access control (orientation)
  await sendCommand(0x36);
  await sendDataArray([0x48]); // MX, BGR

  // Turn on display
  await sendCommand(0x29);
  await setTimeout(20);
};

/**
 * Set the address window for drawing on the display.
 * This defines the area of the display where pixel data will be written.
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
const setWindow = async (x0, y0, x1, y1) =>{
  await sendCommand(0x2A); // Column addr set
  await sendDataArray([
    x0 >> 8, x0 & 0xFF,
    x1 >> 8, x1 & 0xFF,
  ]);

  await sendCommand(0x2B); // Page addr set
  await sendDataArray([
    y0 >> 8, y0 & 0xFF,
    y1 >> 8, y1 & 0xFF,
  ]);
};

/**
 * @param {Buffer} pixelBuffer
 * @returns {Promise<void>}
 * @description Pushes pixel data to the display.
 * The pixelBuffer should be a flat array of RGB565 color values.
 * This function sets the address window and sends the pixel data to the display.
 */
const pushPixels = async (pixelBuffer) => {
  const chunkSize = 4096; // Max chunk size for SPI transfer

  await setWindow(0, 0, WIDTH - 1, HEIGHT - 1);
  await sendCommand(0x2C); // Memory write

  for (let i = 0; i < pixelBuffer.length; i += chunkSize) {
    await sendData(pixelBuffer.slice(i, i + chunkSize));
  }
};

/**
 * Convert smoothed iteration count to RGB565 color.
 * @param {number} mu - Smoothed iteration value
 * @param {number} maxIterations
 * @returns {number} RGB565 color
 */
const getColor = (mu, maxIterations) => {
  if (mu >= maxIterations) return 0x0000; // black = inside the Mandelbrot set

  const t = mu / maxIterations; // normalize to [0,1]

  // HSV to RGB (simple spectrum)
  const h = t; // hue from 0 to 1
  const s = 1.0;
  const v = 1.0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const u = v * (1 - (1 - f) * s);

  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = u; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = u; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = u; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = g = b = 0; // fallback to black
  }

  const R = Math.floor(r * 255);
  const G = Math.floor(g * 255);
  const B = Math.floor(b * 255);

  // Pack to RGB565
  return ((R & 0xF8) << 8) | ((G & 0xFC) << 3) | (B >> 3);
}

/**
 * Create a buffer containing the Mandelbrot fractal image data.
 * This function generates a Mandelbrot fractal image by iterating over each pixel
 * in the defined coordinate range of the complex plane, calculating the number of iterations
 * for each point, and mapping the iteration count to a color.
 * @param {number} xMin - Minimum x-coordinate of the complex plane.
 * @param {number} xMax - Maximum x-coordinate of the complex plane.
 * @param {number} yMin - Minimum y-coordinate of the complex plane.
 * @param {number} yMax - Maximum y-coordinate of the complex plane.
 * @param {number} maxIter - Maximum number of iterations for Mandelbrot calculation.
 * @returns {Buffer} Buffer containing the Mandelbrot fractal image data.
 */
const createMandelbrotBuffer = (xMin, xMax, yMin, yMax, maxIter) =>{
  const buf = Buffer.alloc(WIDTH * HEIGHT * 2);

  for (let py = 0; py < HEIGHT; py++) {
    const y0 = yMin + (py / HEIGHT) * (yMax - yMin);
    for (let px = 0; px < WIDTH; px++) {
      const x0 = xMin + (px / WIDTH) * (xMax - xMin);

      let x = 0, y = 0, iteration = 0;
      while (x*x + y*y <= 4 && iteration < maxIter) {
        const xtemp = x*x - y*y + x0;
        y = 2*x*y + y0;
        x = xtemp;
        iteration++;
      }

      // Map iteration count to color
      let color = getColor(iteration, maxIter);

      const offset = 2 * (py * WIDTH + px);
      buf[offset] = (color >> 8) & 0xFF;
      buf[offset+1] = color & 0xFF;
    }
  }
  return buf;
};

/*
 */
const render = async (frames) => {
  let maxIter = 100; // Number of iterations for Mandelbrot calculation
  let IterationGrowth = 1.1; // Growth factor for iterations
  let centerX = -0.74364304;
  let centerY =  0.131824860209;
  const zoomFactor = 0.70;

  let xMin = -2.0, xMax = 1.0;
  let yMin = -1.5, yMax = 1.5;

  for (let i = 0; i < frames; i++) {
    console.log(`Frame ${i + 1}`);

    const pixelBuffer = createMandelbrotBuffer(xMin, xMax, yMin, yMax, maxIter);
    await pushPixels(pixelBuffer); // your existing function
    await setTimeout(10); // milliseconds

    const width = (xMax - xMin) * zoomFactor;
    const height = (yMax - yMin) * zoomFactor;

    xMin = centerX - width / 2;
    xMax = centerX + width / 2;
    yMin = centerY - height / 2;
    yMax = centerY + height / 2;

    const mandelbrotBuf = createMandelbrotBuffer(xMin, xMax, yMin, yMax, maxIter);
    await pushPixels(mandelbrotBuf);

    maxIter = Math.floor(maxIter * IterationGrowth);
    if (maxIter > 1000) {
      maxIter = 1000; // Limit max iterations to prevent overflow
    }
  }
};

/**
 * Display help message for the script.
 * @returns {void}
 */
const showHelp = () => {
  console.log(`
Usage: node ili9341.js [options]

This script initializes the ILI9341 display
and renders a Mandelbrot fractal image on it.
If more than one frame is requested, then a zoom effect
is applied. Due to limitations of the floating point
precision, zoom with frames above 90 don't work well.

Options:
  --speed=<number>, -s=<number>    Set the maximum clock speed in Hz. Default is 15_000_000 (15MHz).
  --device=<path>, -d=<path>       Set the SPI device path. Default is /dev/spidev0.0.
  --gpiochip=<number>, -g=<number> Set the GPIO chip number. Default is 0.
  --dc-pin=<pin_number>, -c=<pin_number> Set the DC pin number for the display. Required.
  --reset-pin=<pin_number>, -r=<pin_number> Set the Reset pin number for the display. Required.
  --frames=<number>, -f=<number>   Number of frames to render. Default is 1.
  --help, -h                       Show this help message.
`);
};

/**
 * Initialize communication with the ILI9341 display and perform a self-test.
 * This function sets up the SPI device, initializes the display, and runs a self-test
 * to ensure the display is functioning correctly.
 *
 * @throws {Error} If initialization or self-test fails.
 * @return {Promise<void>}
 */
const init = async () => {
  let speed = 15_000_000;
  let dc_pin;
  let reset_pin;
  let device = '/dev/spidev0.0';
  let gpiochip = 0;
  let skipArg = false;

  // Parse command line arguments
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
          throw new Error('Invalid speed value. It should be a positive number.');
        }
        return;
      }

      if (key === '--device' || key === '-d') {
        if (!value) {
          throw new Error('Missing value for --device');
        }
        device = value;
        return;
      }
      if (key === '--gpiochip' || key === '-g') {
        if (!value) {
          throw new Error('Missing value for --gpiochip');
        }
        gpiochip = Number(value);
        if (isNaN(gpiochip) || gpiochip < 0) {
          throw new Error('Invalid GPIO chip number. It should be a non-negative integer.');
        }
        return;
      }
      if (key === '--dc-pin' || key === '-c') {
        if (!value) {
          throw new Error('Missing value for --dc-pin');
        }
        dc_pin = Number(value);
        if (isNaN(dc_pin) || dc_pin < 0) {
          throw new Error('Invalid DC pin number. It should be a non-negative integer.');
        }
        return;
      }
      if (key === '--reset-pin' || key === '-r') {
        if (!value) {
          throw new Error('Missing value for --reset-pin');
        }
        reset_pin = Number(value);
        if (isNaN(reset_pin) || reset_pin < 0) {
          throw new Error('Invalid Reset pin number. It should be a non-negative integer.');
        }
        return;
      }
      if (key === '--frames' || key === '-f') {
        if (!value) {
          throw new Error('Missing value for --frames');
        }
        frames = Number(value);
        if (isNaN(frames) || frames <= 0) {
          throw new Error('Invalid frames value. It should be a positive integer.');
        }
        return;
      }
      if (key === '--help' || key === '-h') {
        showHelp();
        process.exit(0);
      }
      throw new Error(`Unknown argument: ${arg}`);
    });

    if (typeof dc_pin == 'undefined'){
      throw new Error('DC pin is required. Use --dc-pin=<pin_number> to specify it.');
    }

    if (typeof reset_pin == 'undefined'){
      throw new Error('Reset pin is required. Use --reset-pin=<pin_number> to specify it.');
    }
  } catch (err) {
    console.error('\x1b[1;31mError: \x1b[0m', err.message);
    showHelp();
    process.exit(1);
  }

  try {

    chip = new Chip(gpiochip);
    dc = new Line(chip, dc_pin);
    reset = new Line(chip, reset_pin);

    // Set DC and Reset lines to output mode
    dc.requestOutputMode('ili9341-dc', 1);
    reset.requestOutputMode('ili9341-reset', 1);

    spi = new SPIDevice(device, {
      max_speed_hz: speed
    });

    console.log(`\x1b[1;36m-- ILI9341 Display Initialization --\x1b[0m`);
    console.log(`SPI device: \x1b[1;33m${device}\x1b[0m`);
    console.log(`SPI max speed Hz: \x1b[1;33m${spi.getMaxSpeedHz()}\x1b[0m`);
    console.log(`SPI Mode: \x1b[1;33m${spi.getMode()}\x1b[0m`);
    console.log(`SPI bits per word: \x1b[1;33m${spi.getBitsPerWord()}\x1b[0m`);
    console.log(`GPIO chip: \x1b[1;33m${chip.name}\x1b[0m`);
    console.log(`DC PIN: \x1b[1;33m${dc_pin}\x1b[0m`);
    console.log(`Reset PIN: \x1b[1;33m${reset_pin}\x1b[0m`);
  } catch (error) {
    console.error('Error initializing GPIO or SPI:', error);
    throw new Error('Failed to initialize GPIO or SPI. Please check your setup.');
  }
};

const main = async () => {
  await init();

  console.log('Initializing GPIO...');
  dc.setValue(1);
  reset.setValue(1);

  console.log('Initializing display...');
  await initILI9341();

  console.log(`Generating Mandelbrot fractal, ${frames} frame${frames > 1 ? 's' : ''}...`);
  await render(frames);

  console.log('Done!');
}

main().catch(console.error);
