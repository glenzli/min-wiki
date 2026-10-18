<!-- wiki-learning:start -->

A message is not a paper plane, and no wire joins the two phones directly. What helps it travel far away?

Track part 1 one step at a time. Disable the sender’s access, the middle path and the recipient’s access separately; compare where the part waits, then reconnect and continue. Move the sender and see whether the next unsent part uses A or B. Keep delivery separate from simulated opening.

## Infrastructure follows the radio link

A base station sends and receives radio signals to connect a phone to a mobile network. Antennas may be on towers, buildings or smaller sites. Access and onward transport are distinct links. Backhaul can use fibre, cables or wireless connections; this diagram chooses a wired example. Home Wi-Fi first reaches a local access point, then the home network and Internet. A local connection does not guarantee that an Internet service is reachable.

## Numbers track information, not flying objects

A message is represented as digital information. Three parts make tracking and assembly visible; they do not correspond to text length or a fixed protocol format. Network equipment forwards using addresses. Segmentation, restoring order and assembling an application message have different responsibilities in the communication stack. TCP, for example, provides an ordered, reliable byte stream to an application. That does not confirm that a person has read the message. Other protocols and application confirmations differ.

## Routes, waiting and confirmation have limits

“Networks and service” groups several networks and a possible messaging service. Not all communication passes through one server. SMS, online chat, calls and different apps may follow different paths and confirmation rules. An unavailable link blocks only an unfinished crossing in this model, keeping completed parts in place; reconnecting permits continuation. Real networks may retransmit, reroute, store or fail. Protocols, radio strength and real delays are not calculated here. Delivery is counted by an observer of both ends; returned confirmations to the sender are not modelled.

## A common misconception

A phone usually does not send chat content directly by radio to a distant phone. Wireless describes an access link, not a guarantee that the whole route has no cables.

## Model limits

This is a local representative online-chat diagram, sending no real message. Three numbers, six links, ordering and step counts are teaching choices. Time, sizes and distances are uncalibrated; there is no alternate middle route. Loss, retransmission, handover signalling and encryption are not modelled. The drawing cannot establish privacy or security.

## Sources

- [UKHSA · Mobile phone base stations: mobile network technology](https://www.gov.uk/government/publications/mobile-phone-base-stations-radio-waves-and-health/mobile-phone-base-stations-radio-waves-and-health)
- [Internet Society · Solutions for Traffic Backhaul in Community Networks](https://www.internetsociety.org/wp-content/uploads/2020/01/Backhaul-Solutions-Fact-Sheet-shortversion.pdf)
- [Internet Society · Routing Security for Policymakers (routing definitions and architecture)](https://www.internetsociety.org/resources/doc/2018/routing-security-for-policymakers/)
- [IETF RFC 9293 · Transmission Control Protocol, section 2.2](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2)
- [Cisco · Wireless Access Point: objective and network setup](https://www.cisco.com/c/en/us/support/docs/smb/wireless/cisco-small-business-100-series-wireless-access-points/smb5530-set-up-a-wireless-network-using-a-wireless-access-point-wap.html)

## Narration {#narration}

[Download spoken text](narration.en.txt?download) · [Download storyboard](narration.en.storyboard.txt?download)

### Why a distant screen lights up

We want to tell a friend far away, “See you at the park!” A phone cannot shout that far, and no wire directly joins it to the friend’s phone. It represents the message as digital information, reaches a nearby connection and travels through networks. Our picture uses three numbered parts so we can follow them. They are not three little balls that really fly through the air.

*Scene cue: Begin with all three numbers on the sender, pointing out both phones and the base stations.*

### An antenna has an onward link

Follow the first number. The phone uses invisible radio signals to connect to a base station. Reaching the station does not mean reaching the friend! The station connects to a larger network. Our green lines represent cables and fibre, continuing through networks and a messaging service into the friend’s network. Equipment forwards information along the next link. Words do not find their own way.

*Scene cue: Step part 1 along the route, comparing the gold radio dashes and green wired links.*

### What if one link is unavailable

If the friend’s phone is not connected, the last link cannot finish. A part waits in our picture, and the inbox is incomplete. We cannot say the message is delivered yet. Reconnect and continue. Compare a sender without access and an unavailable middle path: parts wait in different places. Real services sometimes wait, and sometimes report that sending failed.

*Scene cue: Reset, disable recipient access and reach step five. Reconnect. Compare the sender and middle-network blocks separately.*

### Delivery is different from reading

All three numbers arrive, and the phone can show the whole message. Receiving it does not mean the friend has read it. Opening it is a separate event. Real apps can use different signs. Before sending a real message, check the recipient with an adult. Do not send strangers your address, passwords or private photos. This little experiment needs no personal message from you.

*Scene cue: Reach step eighteen, compare delivery before and after simulating the recipient opening it.*

<!-- wiki-learning:end -->
