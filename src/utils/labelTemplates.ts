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

// Label format dimensions (twips: 1/1440 inch, 1mm ≈ 56.7 twips)
// 11354: 57x32mm -> 3232x1814 twips
const LABEL_FORMATS: Record<LabelFormat, { width: number; height: number; name: string }> = {
  '30252': { width: 5040, height: 1581, name: '30252 Address (89x28mm)' },
  '99012': { width: 5102, height: 2268, name: '99012 Large Address (89x36mm)' },
  '11354': { width: 3232, height: 1814, name: '11354 Multi-Purpose (57x32mm)' },
  '30336': { width: 3060, height: 1417, name: '30336 Small (54x25mm)' },
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

// Generate label using DesktopLabel format for better Dymo Connect compatibility
function generateDesktopLabel(
  format: LabelFormat,
  lines: { text: string; fontSize: number; bold: boolean; color?: { r: number; g: number; b: number } }[]
): string {
  const { width, height } = LABEL_FORMATS[format];
  
  let yPosition = 100;
  const lineHeight = Math.floor((height - 200) / Math.max(lines.length, 1));
  
  let textObjects = '';
  lines.forEach((line, index) => {
    const color = line.color || { r: 0, g: 0, b: 0 };
    textObjects += `
      <TextObject>
        <Name>Line${index + 1}</Name>
        <ForeColor Alpha="255" Red="${color.r}" Green="${color.g}" Blue="${color.b}"/>
        <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
        <LinkedObjectName/>
        <Rotation>Rotation0</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <GroupID>-1</GroupID>
        <IsOutlined>False</IsOutlined>
        <HorizontalAlignment>Left</HorizontalAlignment>
        <VerticalAlignment>Top</VerticalAlignment>
        <TextFitMode>ShrinkToFit</TextFitMode>
        <UseFullFontHeight>True</UseFullFontHeight>
        <Verticalized>False</Verticalized>
        <StyledText>
          <Element>
            <String xml:space="preserve">${escapeXml(line.text)}</String>
            <Attributes>
              <Font Family="Arial" Size="${line.fontSize}" Bold="${line.bold}" Italic="False" Underline="False" Strikeout="False"/>
              <ForeColor Alpha="255" Red="${color.r}" Green="${color.g}" Blue="${color.b}"/>
            </Attributes>
          </Element>
        </StyledText>
        <ShowBarcodeFor9702>False</ShowBarcodeFor9702>
        <ObjectLayout>
          <DYMOPoint>
            <X>100</X>
            <Y>${yPosition}</Y>
          </DYMOPoint>
          <Size>
            <Width>${width - 200}</Width>
            <Height>${lineHeight}</Height>
          </Size>
        </ObjectLayout>
      </TextObject>`;
    yPosition += lineHeight;
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="3">
    <Description>DYMO Label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>${format}</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint>
        <X>0</X>
        <Y>0</Y>
      </DYMOPoint>
      <Size>
        <Width>${width}</Width>
        <Height>${height}</Height>
      </Size>
    </DYMORect>
    <BorderColor Alpha="255" Red="0" Green="0" Blue="0"/>
    <BorderThickness>1</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>${textObjects}
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
  <LabelApplication>Blank</LabelApplication>
  <DataTable>
    <Columns></Columns>
    <Rows></Rows>
  </DataTable>
</DesktopLabel>`;
}

export function generateRepairLabel(data: RepairLabelData, format: LabelFormat = '11354'): string {
  const shortId = data.repairId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.deviceBrand} ${data.deviceModel}`.substring(0, 30);
  const customerInfo = data.customerName.substring(0, 25);
  const issue = data.issueDescription.substring(0, 40);
  const slotInfo = data.storageSlot ? ` [${data.storageSlot}]` : '';
  
  const lines = [
    { text: `#${shortId}${slotInfo}`, fontSize: 12, bold: true },
    { text: customerInfo, fontSize: 9, bold: true },
    { text: deviceInfo, fontSize: 8, bold: false },
    { text: issue, fontSize: 7, bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: data.intakeDate, fontSize: 7, bold: false, color: { r: 128, g: 128, b: 128 } },
  ];

  return generateDesktopLabel(format, lines);
}

export function generateDeviceLabel(data: DeviceLabelData, format: LabelFormat = '11354'): string {
  const shortId = data.deviceId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.brand} ${data.model}`.substring(0, 30);
  
  const lines = [
    { text: deviceInfo, fontSize: 11, bold: true },
    { text: `ID: ${shortId}`, fontSize: 8, bold: false },
    { text: data.condition, fontSize: 8, bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: `€${data.price.toFixed(2)}`, fontSize: 12, bold: true, color: { r: 0, g: 128, b: 0 } },
  ];

  return generateDesktopLabel(format, lines);
}

export function generateShelfLabel(data: ShelfLabelData, format: LabelFormat = '11354'): string {
  const partName = data.partName.substring(0, 35);
  
  const lines: { text: string; fontSize: number; bold: boolean; color?: { r: number; g: number; b: number } }[] = [
    { text: partName, fontSize: 9, bold: true },
    { text: data.partCode, fontSize: 8, bold: false },
  ];
  
  if (data.location) {
    lines.push({ text: `Pos: ${data.location}`, fontSize: 7, bold: false, color: { r: 128, g: 128, b: 128 } });
  }
  if (data.quantity !== undefined) {
    lines.push({ text: `Qty: ${data.quantity}`, fontSize: 7, bold: true, color: { r: 0, g: 0, b: 128 } });
  }

  return generateDesktopLabel(format, lines);
}
