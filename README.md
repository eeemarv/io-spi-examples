# Examples using @eeemarv/io-spi SPI node native addon

[Link to the @eeemarv/io-spi npm package](https://www.npmjs.com/package/@eeemarv/io-spi) (Find there also a simple loopback test)

To install these examples:

```bash
git clone https://github.com/eeemarv/io-spi-examples.git
```

The example node scripts

* [Reading IUDs from Mifare Tags with a MFRC522 module](https://github.com/eeemarv/io-spi-examples/tree/main/mfrc522#readme)
* [Render fractals on a display with the ILI9341 controller](https://github.com/eeemarv/io-spi-examples/tree/main/ili9341#readme)

Here are some steps to take before usage:

## Enable SPI

Check out if SPI is enabled. To list all available SPI devices:

```bash
ls -l /dev/spi*
```

Check out the manual of your SBC on how to enable the SPI devices.

If you have `raspi-config` (common on the Raspberry Pi), run

```bash
sudo raspi-config
```

Navigate to Interface options > Enable SPI.

On the Orange Pi, run `orangepi-config`

```bash
sudo orangepi-config
```

Navigate to System  > Hardware > Toggle hardware configuration.

## Permission Denied

To allow non-root users to access the SPI device (e.g. `/dev/spidev0.0`, `/dev/spidev1.1`) without sudo, you need to modify the device permissions and group ownership permanently.

### 1. Create a Dedicated Group for SPI Access

```bash
sudo groupadd spi
```

### 2. Set a udev Rule to Change SPI Device Permissions

Ubuntu, Debian and Raspbian use udev to manage device permissions. Create a new rule:

```bash
sudo nano /etc/udev/rules.d/90-spi.rules
```

Add this line to grant read/write access to the `spi` group:

```bash
SUBSYSTEM=="spidev", GROUP="spi", MODE="0660"
```

### 3. Reload udev Rules & Trigger Changes

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### 4. Verify the Changes

Check the SPI device permissions:

```bash
ls -l /dev/spidev*
```

Expected output:

```bash
crw-rw---- 1 root spi 153, 0 Jun 17 10:14 /dev/spidev1.1
```

Now, users in the `spi` group can access it without sudo.

### 5. Add Your User to the Group

```bash
sudo usermod -aG spi $(whoami)  # Replace $(whoami) with the target username
```

(Log out and back in for the group change to take effect.)

## License

MIT