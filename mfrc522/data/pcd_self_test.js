// @ts-check
"use strict";

/**
 * Based on https://github.com/miguelbalboa/rfid
 * and NXP MFRC522 datasheet
 * https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf
 */

const PCD_Test = {
  v0_0: {
    version: 0x90,
    name: 'Version 0.0 (0x90)',
    description: 'Philips Semiconductors; Preliminary Specification Revision 2.0 - 01 August 2005; 16.1 self-test',
    data: [
      0x00, 0x87, 0x98, 0x0f, 0x49, 0xFF, 0x07, 0x19,
      0xBF, 0x22, 0x30, 0x49, 0x59, 0x63, 0xAD, 0xCA,
      0x7F, 0xE3, 0x4E, 0x03, 0x5C, 0x4E, 0x49, 0x50,
      0x47, 0x9A, 0x37, 0x61, 0xE7, 0xE2, 0xC6, 0x2E,
      0x75, 0x5A, 0xED, 0x04, 0x3D, 0x02, 0x4B, 0x78,
      0x32, 0xFF, 0x58, 0x3B, 0x7C, 0xE9, 0x00, 0x94,
      0xB4, 0x4A, 0x59, 0x5B, 0xFD, 0xC9, 0x29, 0xDF,
      0x35, 0x96, 0x98, 0x9E, 0x4F, 0x30, 0x32, 0x8D
    ]
  },
  v1_0: {
    version: 0x91,
    name: 'Version 1.0 (0x91)',
    description: 'NXP Semiconductors; Rev. 3.8 - 17 September 2014; 16.1.1 self-test',
    data: [
      0x00, 0xC6, 0x37, 0xD5, 0x32, 0xB7, 0x57, 0x5C,
      0xC2, 0xD8, 0x7C, 0x4D, 0xD9, 0x70, 0xC7, 0x73,
      0x10, 0xE6, 0xD2, 0xAA, 0x5E, 0xA1, 0x3E, 0x5A,
      0x14, 0xAF, 0x30, 0x61, 0xC9, 0x70, 0xDB, 0x2E,
      0x64, 0x22, 0x72, 0xB5, 0xBD, 0x65, 0xF4, 0xEC,
      0x22, 0xBC, 0xD3, 0x72, 0x35, 0xCD, 0xAA, 0x41,
      0x1F, 0xA7, 0xF3, 0x53, 0x14, 0xDE, 0x7E, 0x02,
      0xD9, 0x0F, 0xB5, 0x5E, 0x25, 0x1D, 0x29, 0x79
    ]
  },
  v2_0: {
    version: 0x92,
    name: 'Version 2.0 (0x92)',
    description: 'NXP Semiconductors; Rev. 3.8 - 17 September 2014; 16.1.1 self-test',
    data: [
      0x00, 0xEB, 0x66, 0xBA, 0x57, 0xBF, 0x23, 0x95,
      0xD0, 0xE3, 0x0D, 0x3D, 0x27, 0x89, 0x5C, 0xDE,
      0x9D, 0x3B, 0xA7, 0x00, 0x21, 0x5B, 0x89, 0x82,
      0x51, 0x3A, 0xEB, 0x02, 0x0C, 0xA5, 0x00, 0x49,
      0x7C, 0x84, 0x4D, 0xB3, 0xCC, 0xD2, 0x1B, 0x81,
      0x5D, 0x48, 0x76, 0xD5, 0x71, 0x61, 0x21, 0xA9,
      0x86, 0x96, 0x83, 0x38, 0xCF, 0x9D, 0x5B, 0x6D,
      0xDC, 0x15, 0xBA, 0x3E, 0x7D, 0x95, 0x3B, 0x2F
    ]
  },
  clone88: {
    version: 0x88,
    name: 'Clone Fudan Semiconductor FM17522 (0x88)',
    description: 'Clone Fudan Semiconductor FM17522 (0x88)',
    data: [
      0x00, 0xD6, 0x78, 0x8C, 0xE2, 0xAA, 0x0C, 0x18,
      0x2A, 0xB8, 0x7A, 0x7F, 0xD3, 0x6A, 0xCF, 0x0B,
      0xB1, 0x37, 0x63, 0x4B, 0x69, 0xAE, 0x91, 0xC7,
      0xC3, 0x97, 0xAE, 0x77, 0xF4, 0x37, 0xD7, 0x9B,
      0x7C, 0xF5, 0x3C, 0x11, 0x8F, 0x15, 0xC3, 0xD7,
      0xC1, 0x5B, 0x00, 0x2A, 0xD0, 0x75, 0xDE, 0x9E,
      0x51, 0x64, 0xAB, 0x3E, 0xE9, 0x15, 0xB5, 0xAB,
      0x56, 0x9A, 0x98, 0x82, 0x26, 0xEA, 0x2A, 0x62
    ]
  }
};

export { PCD_Test };
