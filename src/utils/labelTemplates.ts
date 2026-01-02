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

// Label format dimensions in INCHES (for Dymo Connect compatibility)
// 11354: 57x32mm = 2.24" x 1.26"
// 30252: 89x28mm = 3.5" x 1.1"
const LABEL_FORMATS: Record<LabelFormat, { width: number; height: number; name: string }> = {
  '30252': { width: 3.5, height: 1.1, name: '30252 Address (89x28mm)' },
  '99012': { width: 3.5, height: 1.4, name: '99012 Large Address (89x36mm)' },
  '11354': { width: 2.24, height: 1.26, name: '11354 Multi-Purpose (57x32mm)' },
  '30336': { width: 2.13, height: 0.98, name: '30336 Small (54x25mm)' },
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

// Generate label using DesktopLabel format with inches for Dymo Connect compatibility
function generateDesktopLabel(
  format: LabelFormat,
  lines: { text: string; bold?: boolean; size?: 'large' | 'medium' | 'small'; color?: { r: number; g: number; b: number } }[]
): string {
  const { width, height } = LABEL_FORMATS[format];
  
  // Generate line text spans
  const lineSpans = lines.map(line => {
    const fontSize = line.size === 'large' ? 12 : line.size === 'medium' ? 10 : 8;
    const color = line.color || { r: 0, g: 0, b: 0 };
    return `
              <LineTextSpan>
                <TextSpan>
                  <Text>${escapeXml(line.text)}</Text>
                  <FontInfo>
                    <FontName>Arial</FontName>
                    <FontSize>${fontSize}</FontSize>
                    <IsBold>${line.bold ? 'True' : 'False'}</IsBold>
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
  }).join('');

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
        <X>0.05</X>
        <Y>0.05</Y>
      </DYMOPoint>
      <Size>
        <Width>${width - 0.1}</Width>
        <Height>${height - 0.1}</Height>
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
            <IsVertical>False</IsVertical>${lineSpans}
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.05</X>
              <Y>0.05</Y>
            </DYMOPoint>
            <Size>
              <Width>${width - 0.1}</Width>
              <Height>${height - 0.1}</Height>
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
  
  const lines = [
    { text: `#${shortId}${slotInfo}`, size: 'large' as const, bold: true },
    { text: customerInfo, size: 'medium' as const, bold: true },
    { text: deviceInfo, size: 'small' as const, bold: false },
    { text: issue, size: 'small' as const, bold: false, color: { r: 80, g: 80, b: 80 } },
    { text: data.intakeDate, size: 'small' as const, bold: false, color: { r: 128, g: 128, b: 128 } },
  ];

  return generateDesktopLabel(format, lines);
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

  return generateDesktopLabel(format, lines);
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

  return generateDesktopLabel(format, lines);
}
