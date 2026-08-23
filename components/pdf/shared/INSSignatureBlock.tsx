import type { ComponentProps } from "react";
import { View, Text, Image } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";
import type { PDFSignatureSlot } from "../types/insTypes";

/* eslint-disable jsx-a11y/alt-text */

type INSSignatureBlockProps = {
  slots?: PDFSignatureSlot[];
  layout?: "horizontal" | "vertical-right";
};

const DEFAULT_SLOTS: PDFSignatureSlot[] = [
  {
    key: "prepared",
    lineTitle: "Prepared by:",
    lineSubtitle: "Program Coordinator/Chair",
    signerName: "",
    imageUrl: null,
  },
  {
    key: "reviewed",
    lineTitle: "Reviewed, Certified True and Correct:",
    lineSubtitle: "Director/Dean",
    signerName: "",
    imageUrl: null,
  },
  {
    key: "approved",
    lineTitle: "Approved:",
    lineSubtitle: "Campus Director",
    signerName: "",
    imageUrl: null,
  },
];

type SlotStyle = ComponentProps<typeof View>["style"];

function SignatureSlot({
  slot,
  style,
}: {
  slot: PDFSignatureSlot;
  style: SlotStyle;
}) {
  return (
    <View style={style}>
      <Text style={ins.signatureTitle}>{slot.lineTitle}</Text>
      {slot.imageUrl ? (
        <Image src={slot.imageUrl} style={ins.signatureImage} />
      ) : null}
      {slot.signerName && slot.signerName !== "—" ? (
        <Text style={ins.signatureName}>{slot.signerName}</Text>
      ) : null}
      <View style={ins.signatureLine} />
      <Text style={ins.signatureRole}>{slot.lineSubtitle}</Text>
    </View>
  );
}

/**
 * Two-tier layout, both tiers on the same column grid:
 *   Tier 1 — Prepared by, in column 1 (column 2 left empty)
 *   Tier 2 — Reviewed (column 1) / Approved (column 2)
 *
 * Falls back gracefully if the caller supplies a different number of slots:
 * the first always takes tier 1, the remainder share the second row.
 */
function HorizontalSignatures({ slots }: { slots: PDFSignatureSlot[] }) {
  const [first, ...rest] = slots;
  return (
    <View style={ins.signatureContainer}>
      {first ? (
        // Same two-column row as tier 2, but only the first column is filled,
        // so this slot lines up exactly with the "Reviewed" column below it.
        <View style={ins.signatureTierFirstRow}>
          <SignatureSlot slot={first} style={ins.signatureBlockHalf} />
        </View>
      ) : null}
      {rest.length > 0 ? (
        <View style={ins.signatureTierRow}>
          {rest.map((slot) => (
            <SignatureSlot
              key={slot.key}
              slot={slot}
              style={ins.signatureBlockHalf}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function VerticalRightSignatures({ slots }: { slots: PDFSignatureSlot[] }) {
  return (
    <View style={ins.rightSignatureContainer}>
      {slots.map((slot) => (
        <View key={slot.key} style={ins.rightSignatureSlot}>
          <Text style={ins.rightSigTitle}>{slot.lineTitle}</Text>
          {slot.imageUrl ? (
            <Image src={slot.imageUrl} style={{ height: 16, objectFit: "contain" as const, marginBottom: 1 }} />
          ) : null}
          <View style={ins.rightSigLine} />
          {slot.signerName && slot.signerName !== "—" ? (
            <Text style={ins.rightSigName}>{slot.signerName}</Text>
          ) : null}
          <Text style={ins.rightSigRole}>{slot.lineSubtitle}</Text>
        </View>
      ))}
    </View>
  );
}

export function INSSignatureBlock({
  slots,
  layout = "horizontal",
}: INSSignatureBlockProps) {
  const resolvedSlots = slots && slots.length > 0 ? slots : DEFAULT_SLOTS;
  if (layout === "vertical-right") {
    return <VerticalRightSignatures slots={resolvedSlots} />;
  }
  return <HorizontalSignatures slots={resolvedSlots} />;
}
