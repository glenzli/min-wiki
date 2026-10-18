<!-- wiki-learning:start -->

Why might closing a switch still fail to light a lamp? How can a nightlight respond to nearby light?

Close the switch, then break the lamp return to compare two independent openings. Keep the same board for automatic control: change nearby light, the boundary and the rule. Finally break the return while the controller requests light to distinguish control information from power conditions.

## Complete circuits, charge carriers and energy

A normal low-voltage DC lamp needs a source, load and complete return path. The mechanical switch and lamp return are independent necessary conditions; the electronic switch is held conducting in the manual view. A battery maintains a potential difference and supplies available chemical energy. The filament converts electrical energy into light and heat; charge is not consumed as lamp fuel. Metal wires already contain mobile electrons. Electromagnetic response after a switch change differs from average electron drift. An open circuit prevents sustained current in this branch; it does not imply that all endpoints have zero voltage or that the battery is depleted.

## Sensing and comparing are not understanding a room

A light sensor converts changes in nearby illumination into an electrical signal. A comparator classifies input against a chosen boundary and controls an electronic switch. This page uses an uncalibrated 0–100 light scale: below the boundary is dark, while equality and above are bright. The rule can be on when dark or on when bright. A fixed comparison can be implemented by electronic circuitry or by a processor running a program; AI is unnecessary. A sensor obtains a particular input and cannot infer who is in a room or understand its context from one light reading.

## Information paths, power paths and failures

A transistor can use an electrical signal to control conduction without moving mechanical contacts. The internal line shown here only encodes state. Dashed paths represent sensing–comparison–control roles, not literal single-wire connections. Real signals need reference and return paths; the sensor and comparator also receive battery power. Thick lines show the lamp power branch. Even an ON command cannot deliver power through a broken lamp return. This example inhibits the lamp when sensor input is unavailable. That is an explicit teaching failure policy; real products choose policies for their use, and missing input must not be treated as a zero reading.

## A common misconception

Connecting only one lamp terminal cannot sustain light. A control signal does not replace the battery as the lamp's energy source. Not every device using electricity primarily handles signals, and an automatic response to a fixed rule does not by itself make a device AI.

## Model limits

Only stable switching in a normal low-voltage DC circuit is shown; battery power remains available. Voltage, current magnitude, temperature, filament cooling, switching transients and electromagnetic propagation are not calculated. Light units are not lux, and the electronic switch is not a cutaway. Sensor/comparator power wiring and signal reference/return paths are omitted. A broken lamp return affects only the lamp branch. Noise, sampling, hysteresis and the lamp shining onto its own sensor are omitted. Wiring is on screen only; this is not a guide to sockets, chargers, battery disassembly or repairs.

## Sources

- [U.S. EIA Energy Kids · Electricity travels in circuits](https://www.eia.gov/kids/energy-sources/electricity/science-of-electricity.php)
- [Micro:bit Educational Foundation · Sensors](https://microbit.org/get-started/features/sensors/)
- [Micro:bit Educational Foundation · Inputs, outputs and processors](https://microbit.org/get-started/features/inputs-outputs-and-processors/)
- [Micro:bit Educational Foundation · Nightlight](https://microbit.org/projects/make-it-code-it/nightlight/)
- [OpenStax · Current and drift](https://openstax.org/books/college-physics-2e/pages/20-1-current)
- [Texas Instruments · Introduction to Power MOSFETs](https://www.ti.com/lit/pdf/snva008)
- [U.S. DOE · Batteries](https://www.energy.gov/science/doe-explainsbatteries)

## Narration {#narration}

[Download spoken text](narration.en.txt?download) · [Download storyboard](narration.en.storyboard.txt?download)

### Find two places that can open

Here is a light board on our table. The battery is on the left, the bulb on the right, and thick lines trace a loop. But the supply switch contacts are still apart. Close them on screen and the lamp lights. Now look at the return below. Break it, and the lamp cannot stay on even though the switch is still closed. It needs a complete path, without a missing section. We use only screen controls; a grown-up handles real electrical devices.

*Scene cue: Start in manual mode with an open switch. Point to the contact gap, close it, then break the return while keeping the switch closed.*

### Who supplies energy, and who supplies information?

Reconnect the return and try automatic control. The board has not changed; the battery and lamp keep their places. Now look closely at the information path in the middle. The sensor receives nearby light. A little comparator follows our chosen rule to control the electronic switch. That small board also uses battery energy. Dashed lines show control information; they are different from the thick lamp power circuit.

*Scene cue: Repair the return and enter automatic control. Point to sensor, comparator and electronic switch while following the four signal-story cards.*

### Keep the environment, change the rule

Choose on when dark. Shade the sensor, then light it. Shading makes the rule request light; lighting the sensor makes it request no light. Now keep that same light level and choose on when bright. The result changes again. The sensor has not suddenly understood the room. It reports light, and the components follow a rule we chose. This automatic job does not need to be called artificial intelligence.

*Scene cue: Close the supply switch; compare teaching levels 15 and 85 under the dark rule. Keep 85 and reverse the rule. Do not describe the scale as measured illuminance.*

### An ON request still needs a complete loop

Make the lamp light, then break its return. The comparator still requests light and the electronic switch still allows conduction, but the lamp goes off. Information says what to do; energy and a complete loop make it possible. Reconnect the return, then unplug the illustrated sensor signal. That means no reading, rather than very dark. Our example keeps the lamp off for now. Real products may be designed differently.

*Scene cue: In automatic mode, break the return while the command is ON; the third card conducts while the fourth says off. Repair it and disconnect sensor input; confirm unavailable input.*

<!-- wiki-learning:end -->
