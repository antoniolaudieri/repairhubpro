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
  storageSlot?: string; // Added storage slot
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

// Label format dimensions in TWIPS for DieCutLabel format
// 11354/30332: 57x32mm -> Width=3240 (57mm), Height=1814 (32mm)
// 30252: 89x28mm -> Width=5040 (89mm), Height=1584 (28mm)
const LABEL_FORMATS: Record<LabelFormat, { 
  width: number; 
  height: number; 
  name: string;
  paperId: string;
  paperName: string;
}> = {
  '30252': { width: 5040, height: 1584, name: '30252 Address (89x28mm)', paperId: 'Address', paperName: '30252 Address' },
  '99012': { width: 5040, height: 2016, name: '99012 Large Address (89x36mm)', paperId: 'LargeAddress', paperName: '99012 Large Address' },
  '11354': { width: 3240, height: 1814, name: '11354 Multi-Purpose (57x32mm)', paperId: 'Small30332', paperName: '30332 Multipurpose' },
  '30336': { width: 3024, height: 1386, name: '30336 Small (54x25mm)', paperId: 'Small30336', paperName: '30336 Small Multipurpose' },
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

// Generate label using DieCutLabel format with twips - standard Dymo SDK format
function generateDieCutLabel(
  format: LabelFormat,
  lines: { text: string; bold?: boolean; size?: 'large' | 'medium' | 'small'; color?: { r: number; g: number; b: number } }[]
): string {
  const { width, height, paperId, paperName } = LABEL_FORMATS[format];
  
  // Build styled text elements
  const styledElements = lines.map((line, idx) => {
    const fontSize = line.size === 'large' ? 14 : line.size === 'medium' ? 10 : 8;
    const color = line.color || { r: 0, g: 0, b: 0 };
    const prefix = idx === 0 ? '' : '\\n';
    return `
        <Element>
          <String>${prefix}${escapeXml(line.text)}</String>
          <Attributes>
            <Font Family="Arial" Size="${fontSize}" Bold="${line.bold ? 'True' : 'False'}" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="${color.r}" Green="${color.g}" Blue="${color.b}"/>
          </Attributes>
        </Element>`;
  }).join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>${paperId}</Id>
  <PaperName>${paperName}</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${height}" Height="${width}" Rx="113" Ry="113"/>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>TEXT</Name>
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
      <StyledText>${styledElements}
      </StyledText>
    </TextObject>
    <Bounds X="100" Y="100" Width="${width - 200}" Height="${height - 200}"/>
  </ObjectInfo>
</DieCutLabel>`;
}

export function generateRepairLabel(data: RepairLabelData, format: LabelFormat = '11354'): string {
  const shortId = data.repairId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.deviceBrand} ${data.deviceModel}`.substring(0, 30);
  const customerInfo = data.customerName.substring(0, 25);
  const issue = data.issueDescription.substring(0, 40);
  const slotInfo = data.storageSlot ? ` [${data.storageSlot}]` : '';
  
  const lines = [
    { text: `#${shortId}${slotInfo}`, size: 'large' as const, bold: true },
    { text: customerInfo, size: 'medium' as const, bold: true },
    { text: deviceInfo, size: 'small' as const, bold: false },
    { text: issue, size: 'small' as const, bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: data.intakeDate, size: 'small' as const, bold: false, color: { r: 128, g: 128, b: 128 } },
  ];

  return generateDieCutLabel(format, lines);
}

export function generateDeviceLabel(data: DeviceLabelData, format: LabelFormat = '11354'): string {
  const shortId = data.deviceId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.brand} ${data.model}`.substring(0, 30);
  
  const lines = [
    { text: deviceInfo, size: 'large' as const, bold: true },
    { text: `ID: ${shortId}`, size: 'small' as const, bold: false },
    { text: data.condition, size: 'small' as const, bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: `€${data.price.toFixed(2)}`, size: 'large' as const, bold: true, color: { r: 0, g: 128, b: 0 } },
  ];

  return generateDieCutLabel(format, lines);
}

export function generateShelfLabel(data: ShelfLabelData, format: LabelFormat = '11354'): string {
  const partName = data.partName.substring(0, 35);
  
  const lines: { text: string; size?: 'large' | 'medium' | 'small'; bold?: boolean; color?: { r: number; g: number; b: number } }[] = [
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
