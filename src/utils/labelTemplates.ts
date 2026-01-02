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

// Label dimensions in inches - Width is the shorter side (32mm = 1.26"), Height is the longer side (57mm = 2.24")
// For Dymo Landscape mode: Width = 32mm = 1.26", Height = 57mm = 2.24"
const LABEL_FORMATS: Record<LabelFormat, { 
  width: number; 
  height: number; 
  name: string;
  labelName: string;
}> = {
  '30252': { width: 1.125, height: 3.5, name: '30252 Address (89x28mm)', labelName: 'Address' },
  '99012': { width: 1.4, height: 3.5, name: '99012 Large Address (89x36mm)', labelName: 'LargeAddress' },
  '11354': { width: 1.18, height: 2.15, name: '11354 Multi-Purpose (57x32mm)', labelName: 'Small30332' },
  '30336': { width: 1.0, height: 2.125, name: '30336 Small (54x25mm)', labelName: 'ReturnAddress' },
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

// Generate DesktopLabel XML for Dymo Connect - formato orizzontale
function generateDesktopLabel(format: LabelFormat, lines: LabelLine[]): string {
  const { width, height, labelName } = LABEL_FORMATS[format];
  
  // Build LineTextSpan elements
  const lineSpans = lines.map((line) => {
    const fontSize = line.size === 'large' ? 11 : line.size === 'medium' ? 9 : 7;
    const isBold = line.bold ? 'True' : 'False';
    const color = line.color || { r: 0, g: 0, b: 0 };
    
    return `            <LineTextSpan>
              <TextSpan>
                <Text>${escapeXml(line.text)}</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>${fontSize}</FontSize>
                  <IsBold>${isBold}</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="${color.r / 255}" G="${color.g / 255}" B="${color.b / 255}"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="3">
    <Description>DYMO Label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>${labelName}</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint>
        <X>0.05</X>
        <Y>0.05</Y>
      </DYMOPoint>
      <Size>
        <Width>${width.toFixed(2)}</Width>
        <Height>${height.toFixed(2)}</Height>
      </Size>
    </DYMORect>
    <BorderColor>
      <SolidColorBrush>
        <Color A="1" R="0" G="0" B="0"></Color>
      </SolidColorBrush>
    </BorderColor>
    <BorderThickness>1</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        <TextObject>
          <Name>Text</Name>
          <Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Top</VerticalAlignment>
          <FitMode>AlwaysFit</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>AlwaysFit</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Top</VerticalAlignment>
            <IsVertical>False</IsVertical>
${lineSpans}
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.05</X>
              <Y>0.05</Y>
            </DYMOPoint>
            <Size>
              <Width>${width.toFixed(2)}</Width>
              <Height>${height.toFixed(2)}</Height>
            </Size>
          </ObjectLayout>
        </TextObject>
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
</DesktopLabel>`;
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

  return generateDesktopLabel(format, lines);
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

  return generateDesktopLabel(format, lines);
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

  return generateDesktopLabel(format, lines);
}
