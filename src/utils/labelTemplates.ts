// Dymo Label Templates for LabLinkRiparo

export type LabelFormat = '30252' | '99012' | '11354' | '30336';

export interface RepairLabelData {
  repairId: string;
  customerName: string;
  phone: string;
  deviceBrand: string;
  deviceModel: string;
  deviceType: string;
  issueDescription: string;
  intakeDate: string;
  trackingUrl?: string;
  storageSlot?: string;
}

export interface DeviceLabelData {
  deviceId: string;
  brand: string;
  model: string;
  condition: string;
  price: number;
  trackingUrl?: string;
}

export interface ShelfLabelData {
  partName: string;
  partCode: string;
  location?: string;
  quantity?: number;
}

// Label dimensions in twips for DieCutLabel format (1 inch = 1440 twips, 1mm = 56.7 twips)
// 11354: 57mm x 32mm → 3230 x 1814 twips
const LABEL_FORMATS: Record<LabelFormat, { 
  widthTwips: number; 
  heightTwips: number; 
  name: string;
  paperName: string;
  paperId: string;
}> = {
  '30252': { widthTwips: 5040, heightTwips: 1620, name: '30252 Address (89x28mm)', paperName: '30252 Address', paperId: 'Address' },
  '99012': { widthTwips: 5040, heightTwips: 2040, name: '99012 Large Address (89x36mm)', paperName: '99012 Large Address', paperId: 'LargeAddress' },
  '11354': { widthTwips: 3230, heightTwips: 1814, name: '11354 Multi-Purpose (57x32mm)', paperName: '30332 Multipurpose', paperId: 'Multipurpose' },
  '30336': { widthTwips: 3060, heightTwips: 1440, name: '30336 Small (54x25mm)', paperName: '30336 Return Address', paperId: 'ReturnAddress' },
};

export function getLabelFormats(): { value: LabelFormat; label: string }[] {
  return Object.entries(LABEL_FORMATS).map(([value, { name }]) => ({
    value: value as LabelFormat,
    label: name,
  }));
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface LabelLine {
  text: string;
  size?: 'large' | 'medium' | 'small';
  bold?: boolean;
  color?: { r: number; g: number; b: number };
}

// Generate DieCutLabel XML for Dymo - formato landscape orizzontale
function generateDieCutLabel(format: LabelFormat, lines: LabelLine[]): string {
  const { widthTwips, heightTwips, paperName, paperId } = LABEL_FORMATS[format];
  
  // Build StyledText elements
  const styledElements = lines.map((line, index) => {
    const fontSize = line.size === 'large' ? 12 : line.size === 'medium' ? 10 : 8;
    const isBold = line.bold ? 'True' : 'False';
    const color = line.color || { r: 0, g: 0, b: 0 };
    const prefix = index === 0 ? '' : '&#13;&#10;';
    
    return `        <Element>
          <String>${prefix}${escapeXml(line.text)}</String>
          <Attributes>
            <Font Family="Arial" Size="${fontSize}" Bold="${isBold}" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="${color.r}" Green="${color.g}" Blue="${color.b}"/>
          </Attributes>
        </Element>`;
  }).join('\n');

  // Per landscape: Width è il lato corto, Height è il lato lungo
  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>${paperId}</Id>
  <PaperName>${paperName}</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${heightTwips}" Height="${widthTwips}" Rx="0" Ry="0"/>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>Text</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Top</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
${styledElements}
      </StyledText>
    </TextObject>
    <Bounds X="100" Y="100" Width="${widthTwips - 200}" Height="${heightTwips - 200}"/>
  </ObjectInfo>
</DieCutLabel>`;
}

export function generateRepairLabel(data: RepairLabelData, format: LabelFormat = '11354'): string {
  const shortId = data.repairId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.deviceBrand} ${data.deviceModel}`.substring(0, 30);
  const customerInfo = data.customerName.substring(0, 25);
  const issue = data.issueDescription.substring(0, 40);
  const slotInfo = data.storageSlot ? ` [${data.storageSlot}]` : '';
  
  const lines: LabelLine[] = [
    { text: `#${shortId}${slotInfo}`, size: 'large', bold: true },
    { text: customerInfo, size: 'medium', bold: true },
    { text: deviceInfo, size: 'small', bold: false },
    { text: issue, size: 'small', bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: data.intakeDate, size: 'small', bold: false, color: { r: 128, g: 128, b: 128 } },
  ];

  return generateDieCutLabel(format, lines);
}

export function generateDeviceLabel(data: DeviceLabelData, format: LabelFormat = '11354'): string {
  const shortId = data.deviceId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.brand} ${data.model}`.substring(0, 30);
  
  const lines: LabelLine[] = [
    { text: deviceInfo, size: 'large', bold: true },
    { text: `ID: ${shortId}`, size: 'small', bold: false },
    { text: data.condition, size: 'small', bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: `€${data.price.toFixed(2)}`, size: 'large', bold: true, color: { r: 0, g: 128, b: 0 } },
  ];

  return generateDieCutLabel(format, lines);
}

export function generateShelfLabel(data: ShelfLabelData, format: LabelFormat = '11354'): string {
  const partName = data.partName.substring(0, 35);
  
  const lines: LabelLine[] = [
    { text: partName, size: 'medium', bold: true },
    { text: data.partCode, size: 'small', bold: false },
  ];
  
  if (data.location) {
    lines.push({ text: `Pos: ${data.location}`, size: 'small', bold: false, color: { r: 128, g: 128, b: 128 } });
  }
  if (data.quantity !== undefined) {
    lines.push({ text: `Qty: ${data.quantity}`, size: 'small', bold: true, color: { r: 0, g: 0, b: 128 } });
  }

  return generateDieCutLabel(format, lines);
}
