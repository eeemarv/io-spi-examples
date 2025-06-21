## MFRC522

![MFRC522 test on a Orange Pi 3 Zero](https://raw.githubusercontent.com/eeemarv/io-spi-examples/main/mfrc522/images/opiz3_mfrc522.webp)

The RC522 module (with MFRC522 NXP chip) can
communicate with the contactless Mifare tags.
This test performs a self test and then scans for
tag UIDs (4, 7 or 10 bytes).

For this example, you don't connect the RESET (RST) and IRQ. Only control via the SPI bus is needed.

```bash
# install
npm install
# run
node run.js
# Use the `--help` flag to see all possible options.
```

![MFRC522 Test Terminal](https://raw.githubusercontent.com/eeemarv/io-spi-examples/main/mfrc/images/cli_mfrc522.png)

If the self test fails (in case of a clone MFRC522), it can be disabled with `--no-self-test`.
