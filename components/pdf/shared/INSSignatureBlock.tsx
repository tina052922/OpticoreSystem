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

function HorizontalSignatures({ slots }: { slots: PDFSignatureSlot[] }) {
  return (
    <View style={ins.signatureContainer}>
      {slots.map((slot) => (
        <View key={slot.key} style={ins.signatureBlock}>
          <Text style={ins.signatureTitle}>{slot.lineTitle}</Text>
          {slot.imageUrl ? (
            <Image src={slot.imageUrl} style={ins.signatureImage} />
          ) : null}
          <View style={ins.signatureLine} />
          {slot.signerName && slot.signerName !== "—" ? (
            <Text style={ins.signatureName}>{slot.signerName}</Text>
          ) : null}
          <Text style={ins.signatureRole}>{slot.lineSubtitle}</Text>
        </View>
      ))}
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
