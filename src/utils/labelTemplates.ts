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

// Label format dimensions (twips: 1/1440 inch)
const LABEL_FORMATS: Record<LabelFormat, { width: number; height: number; name: string }> = {
  '30252': { width: 5040, height: 1581, name: '30252 Address (89x28mm)' },
  '99012': { width: 5102, height: 2268, name: '99012 Large Address (89x36mm)' },
  '11354': { width: 3240, height: 1602, name: '11354 Multi-Purpose (57x32mm)' },
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

export function generateRepairLabel(data: RepairLabelData, format: LabelFormat = '30252'): string {
  const { width, height } = LABEL_FORMATS[format];
  const shortId = data.repairId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.deviceBrand} ${data.deviceModel}`.substring(0, 30);
  const customerInfo = data.customerName.substring(0, 25);
  const issue = data.issueDescription.substring(0, 40);
  const slotInfo = data.storageSlot ? ` [${data.storageSlot}]` : '';
  
  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>Address</Id>
  <PaperName>${format} Address</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${height}" Height="${width}" Rx="270" Ry="270"/>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>RepairInfo</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>True</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Top</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>#${escapeXml(shortId)}${escapeXml(slotInfo)}</String>
          <Attributes>
            <Font Family="Arial" Size="12" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${escapeXml(customerInfo)}</String>
          <Attributes>
            <Font Family="Arial" Size="9" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${escapeXml(deviceInfo)}</String>
          <Attributes>
            <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${escapeXml(issue)}</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="False" Italic="True" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="80" Green="80" Blue="80"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${escapeXml(data.intakeDate)}</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="128" Green="128" Blue="128"/>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="200" Y="100" Width="${width - 400}" Height="${height - 200}"/>
  </ObjectInfo>
</DieCutLabel>`;
}

export function generateDeviceLabel(data: DeviceLabelData, format: LabelFormat = '30252'): string {
  const { width, height } = LABEL_FORMATS[format];
  const shortId = data.deviceId.slice(0, 8).toUpperCase();
  const deviceInfo = `${data.brand} ${data.model}`.substring(0, 30);
  
  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>Address</Id>
  <PaperName>${format} Address</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${height}" Height="${width}" Rx="270" Ry="270"/>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>DeviceInfo</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>True</IsVariable>
      <HorizontalAlignment>Left</HorizontalAlignment>
      <VerticalAlignment>Top</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${escapeXml(deviceInfo)}</String>
          <Attributes>
            <Font Family="Arial" Size="11" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;ID: ${escapeXml(shortId)}</String>
          <Attributes>
            <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${escapeXml(data.condition)}</String>
          <Attributes>
            <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="80" Green="80" Blue="80"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;€${data.price.toFixed(2)}</String>
          <Attributes>
            <Font Family="Arial" Size="12" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="128" Blue="0"/>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="200" Y="100" Width="${width - 400}" Height="${height - 200}"/>
  </ObjectInfo>
</DieCutLabel>`;
}

export function generateShelfLabel(data: ShelfLabelData, format: LabelFormat = '30336'): string {
  const { width, height } = LABEL_FORMATS[format];
  const partName = data.partName.substring(0, 35);
  
  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>Multipurpose</Id>
  <PaperName>${format} Multipurpose</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${height}" Height="${width}" Rx="180" Ry="180"/>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>ShelfInfo</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>True</IsVariable>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${escapeXml(partName)}</String>
          <Attributes>
            <Font Family="Arial" Size="9" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${escapeXml(data.partCode)}</String>
          <Attributes>
            <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        ${data.location ? `<Element>
          <String>&#13;&#10;Pos: ${escapeXml(data.location)}</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="128" Green="128" Blue="128"/>
          </Attributes>
        </Element>` : ''}
        ${data.quantity !== undefined ? `<Element>
          <String>&#13;&#10;Qty: ${data.quantity}</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="128"/>
          </Attributes>
        </Element>` : ''}
      </StyledText>
    </TextObject>
    <Bounds X="100" Y="80" Width="${width - 200}" Height="${height - 160}"/>
  </ObjectInfo>
</DieCutLabel>`;
}
