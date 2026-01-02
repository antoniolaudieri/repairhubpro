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

// Label dimensions in inches for DesktopLabel format (Dymo Connect)
// 11354: 57x32mm - fisicamente largo 57mm, alto 32mm
// La stampante Dymo tratta le etichette come "portrait" di default
// quindi dobbiamo scambiare le dimensioni per ottenere l'orientamento corretto
const LABEL_FORMATS: Record<LabelFormat, { 
  physicalWidth: number;  // mm - lato lungo fisico
  physicalHeight: number; // mm - lato corto fisico
  name: string;
  labelName: string;
}> = {
  '30252': { physicalWidth: 89, physicalHeight: 28, name: '30252 Address (89x28mm)', labelName: 'Address' },
  '99012': { physicalWidth: 89, physicalHeight: 36, name: '99012 Large Address (89x36mm)', labelName: 'LargeAddress' },
  '11354': { physicalWidth: 57, physicalHeight: 32, name: '11354 Multi-Purpose (57x32mm)', labelName: 'Small30332' },
  '30336': { physicalWidth: 54, physicalHeight: 25, name: '30336 Small (54x25mm)', labelName: 'ReturnAddress' },
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

// Converti mm in pollici
function mmToInches(mm: number): number {
  return mm / 25.4;
}

// Generate DesktopLabel XML for Dymo Connect
// Usiamo Landscape con Width = lato lungo, Height = lato corto
function generateDieCutLabel(format: LabelFormat, lines: LabelLine[]): string {
  const { physicalWidth, physicalHeight, labelName } = LABEL_FORMATS[format];
  
  // Per Landscape: Width = lato lungo (57mm), Height = lato corto (32mm)
  const labelWidth = mmToInches(physicalWidth);   // 57mm = 2.24"
  const labelHeight = mmToInches(physicalHeight); // 32mm = 1.26"
  
  // Build FormattedText with LineTextSpan elements
  const lineSpans = lines.map((line) => {
    const fontSize = line.size === 'large' ? 11 : line.size === 'medium' ? 9 : 7;
    const isBold = line.bold ? 'True' : 'False';
    const color = line.color || { r: 0, g: 0, b: 0 };
    
    return `          <LineTextSpan>
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
                    <Color A="1" R="${(color.r / 255).toFixed(2)}" G="${(color.g / 255).toFixed(2)}" B="${(color.b / 255).toFixed(2)}"></Color>
                  </SolidColorBrush>
                </FontBrush>
              </FontInfo>
            </TextSpan>
          </LineTextSpan>`;
  }).join('\n');

  const objectWidth = labelWidth - 0.1;
  const objectHeight = labelHeight - 0.1;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="3">
    <Description>LabLinkRiparo Label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>${labelName}</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint>
        <X>0</X>
        <Y>0</Y>
      </DYMOPoint>
      <Size>
        <Width>${labelWidth.toFixed(2)}</Width>
        <Height>${labelHeight.toFixed(2)}</Height>
      </Size>
    </DYMORect>
    <BorderColor>
      <SolidColorBrush>
        <Color A="1" R="0" G="0" B="0"></Color>
      </SolidColorBrush>
    </BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        <TextObject>
          <Name>LabelText</Name>
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
              <Width>${objectWidth.toFixed(2)}</Width>
              <Height>${objectHeight.toFixed(2)}</Height>
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
