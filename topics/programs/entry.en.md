<!-- wiki-learning:start -->

Does arriving at B always mean the parcel was delivered? How do instruction order and a box on the road change this delivery?

Step through pickup, movement and unloading. Switch to the route experiment and change the box before executing the decision card to compare two routes. Finally locate the first mismatch in the faulty order, swap the first two cards and test again.

## Programs, hardware and execution state

A program expresses a plan using instructions a device can execute; hardware is the physical equipment needed to perform those tasks. Here, pickup, grid movement and unloading form a finite command set, executed one command at a time. A pointer marks the next instruction, while parcel state and position record what has happened. Results depend on instructions, order and starting conditions, not simply final location. Real devices also need power, a processor to run software and components connecting inputs and outputs.

## Inputs, conditions and branches

A sensor reading is an input; rules in the program determine how it is handled; movement and parcel actions are outputs. When the decision card executes, this page reads whether the next square contains a box. Only the corresponding branch is inserted into the flow, before returning to the shared unloading step. Changing the input before the decision changes the route. Changing the environment afterwards does not rewrite the earlier reading. Real systems can check repeatedly; one decision is retained here to make sampling time and selection clear.

## Debugging uses observable evidence

State the goal, predict behavior, observe actual state, locate the difference, correct it and retest. In the faulty example, the cart leaves pickup first, so the next pickup cannot be completed; the parcel’s location is a clue to the cause. Testing the swapped order from the same starting state checks whether this correction works. Real programs may have more inputs, branches and error handling. One successful test does not establish correctness in every situation.

## A common misconception

A program is neither the cart nor the wish “deliver it”; it is instructions a device can execute. Choosing a branch does not mean human-like understanding of a road. This example does not use AI.

## Model limits

This local teaching interpreter has fixed commands, an exact grid and an ideal sensor. Pickup and time do not simulate real mechanics. A box added after the decision invokes a screen-overlap guard, not a new sensor reading. Real robots could collide without further sensing and also need uncertainty handling and safety strategies. Switching experiments retains state; editing instructions or retesting explicitly starts again.

## Sources

- [Barefoot Computing · Programming](https://www.barefootcomputing.org/concepts-and-approaches/programming)
- [Barefoot Computing · Selection](https://www.barefootcomputing.org/concepts-and-approaches/selection)
- [Barefoot Computing · Debugging](https://www.barefootcomputing.org/concepts-and-approaches/debugging)
- [University of Canterbury · CS Unplugged: Kidbots](https://www.csunplugged.org/en/topics/kidbots/)

## Narration {#narration}

[Download spoken text](narration.en.txt?download) · [Download storyboard](narration.en.storyboard.txt?download)

### Who plans the next step?

A phone can time things, and a washing machine can wash in steps. Inside, programs let the devices carry out tasks. Wheels, motors and chips you can touch are hardware. Instructions that tell a device how to do things are software. Look at this cart. We want it to carry a parcel from pickup to delivery. A wish alone is not enough: we need clear steps for the things it must do.

*Scene cue: Show the cart and parcel at A alongside the full instruction list, without executing yet.*

### Each step has a before and after

Pick up first. Then move right, reach delivery and put the parcel down. The cart executes just the next instruction each time. The green line records the route already travelled, and checked cards record completed actions. Is arriving the same as delivering? If pickup is forgotten, the cart can arrive without the parcel. Order changes the result.

*Scene cue: Step through pickup, pause mid-route, then unload; follow the one retained parcel’s location.*

### Read the input, choose one route

Now there may be a box on the road. At the junction, the cart reads its sensor when the look-ahead instruction executes. We have already written a rule: a box means use the side route; no box means go straight. It follows just one route each time. One program can produce different actions for different inputs. The cart has not come to understand roads itself; the program specifies the choice.

*Scene cue: Retest with and without a box, pausing before the decision. Show the chosen branch cards while the other branch remains unexecuted.*

### Find the first mismatch

Finally, try this faulty program. The cart moves away, but its next instruction asks it to pick up at the pickup station. The parcel is still in the original place, so the action cannot work. We can predict, test one instruction at a time, locate a mismatch, change it and check again from the same starting point. Making programs often involves this kind of debugging. A failed first try helps us find a problem; a successful delivery can still be tested with other conditions.

*Scene cue: Execute the wrong order until pickup fails. Swap the first two cards, explicitly reset, and complete the new test step by step.*

<!-- wiki-learning:end -->
