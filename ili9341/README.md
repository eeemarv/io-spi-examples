# ILI9341

![Loopback test on a Orange Pi 3 Zero](https://raw.githubusercontent.com/eeemarv/io-spi-examples/main/ili9341/images/opiz3_ili9341.webp)

In this example we draw a fractal on a small ILI3941
display and even zoom in the fractal frame by frame.

These small display modules run on 3.3V but usually
have a voltage regulator that can convert from 5v to 3.3v.
There is a small jumper J1 on the back to disable the
voltage regulator so the display can run directly on 3.3v.

## GPIO Setup

Apart from the SPI interface also 2 GPIO lines are needed, DC, to select betweem Data or Command, and RESET.
The example uses package [node-libgpiod](https://www.npmjs.com/package/node-libgpiod) to control the GPIOs through the
`/dev/gpiochipX` character device.

The user needs permissions for access to `/dev/gpiochipX`.

Create a special gpiochip group:

```bash
sudo groupadd gpiochip
```

And add a file to the udev rules:

```bash
# /etc/udev/rules.d/85-gpiochip.rules
KERNEL=="gpiochip*", SUBSYSTEM=="gpio", MODE="0660", GROUP="gpiochip"
```

Add the user to the gpiochip group:

```bash
sudo usermod -aG gpiochip $USER
```

Then you need to find out the gpiochip and  GPIO pin numbers you are going to use.

E.g. on the Orange Pi 3 Zero in the image, pin PC7 is connected to DC and pin PC10 to RESET.
GPIO Pin numbers on the Orange Pi 3 Zero are found as follows:

```typescript
GPIO number = (Port number × 32) + pin number
```

When using PC7 for DC and PC10 for RESET (Port C = 2)

| Pin  | Port | Pin# on port | GPIO# = 2\*32 + pin# |
| ---- | ---- | ------------ | -------------------- |
| PC7  | 2    | 7            | 64 + 7 = 71          |
| PC10 | 2    | 10           | 64 + 10 = 74         |

`--dc-pin` and `--reset-pin` are then required arguments for running the example

```bash
node run.js --dc-pin=71 --reset-pin=74 --device=/dev/spidev1.1 --frames=24
# Use the `--help` flag to see all possible options.
```
