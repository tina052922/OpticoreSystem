import { View, Text, Image } from "@react-pdf/renderer";
import { ins } from "../styles/insStyles";

/* react-pdf's <Image> is a PDF primitive, not an HTML <img> — it has no `alt` prop. */
/* eslint-disable jsx-a11y/alt-text */

/**
 * Combined CTU letterhead banner (seal + university wordmark in one asset),
 * shown centered above the form title. It replaces the previous pair of
 * separate left/right logos.
 *
 * Logos live in `public/`, so this is a same-origin absolute path. react-pdf
 * resolves it in the browser (PDFViewer/BlobProvider) without CORS issues. If
 * these documents are ever rendered server-side (renderToBuffer), pass an
 * absolute filesystem path or a Buffer via the `headerBanner` prop instead —
 * Node cannot resolve a bare "/images/..." URL.
 */
const CTU_HEADER_BANNER = "/images/logos/ctu-header-with-logo.png";

type INSHeaderProps = {
  formCode: string;
  formTitle: string;
  semesterLabel: string;
  universityName?: string;
  formDate?: string;
  revision?: string;
  /** Pass `null` to hide the banner (e.g. printing on pre-headed paper). */
  headerBanner?: string | null;
};

export function INSHeader({
  formCode,
  formTitle,
  semesterLabel,
  universityName = "",
  formDate = new Date(Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  revision = "2",
  headerBanner = CTU_HEADER_BANNER,
}: INSHeaderProps) {
  return (
    <View>
      {/*
        The banner is centred against the full content width, and the form-meta
        box is absolutely pinned to the top-right of this same block. Keeping
        the meta box out of normal flow is what allows the banner to be truly
        page-centred rather than centred in the space left beside it.
      */}
      <View style={ins.headerBlock}>
        {headerBanner ? (
          <View style={ins.headerBannerRow}>
            <Image src={headerBanner} style={ins.headerBanner} />
          </View>
        ) : null}

        {universityName ? (
          <Text style={ins.universityName}>{universityName}</Text>
        ) : null}

        <View style={ins.headerRight}>
          <Text style={ins.headerRightBold}>{formCode}</Text>
          <Text>{formDate}</Text>
          <Text>Revision: {revision}</Text>
        </View>
      </View>

      <View style={ins.navyRule} />

      <View style={ins.formTitleRow}>
        <View style={ins.formTitleCenter}>
          <Text style={ins.formTitle}>{formTitle}</Text>
          <Text style={ins.formSubtitle}>Day Program</Text>
          <Text style={ins.semesterLine}>{semesterLabel}</Text>
        </View>
      </View>
    </View>
  );
}
