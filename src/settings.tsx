import { FC, useEffect, useState } from 'react'
import ipRegex from 'ip-regex';
import { Button, Classes, Dialog, FormGroup, InputGroup, Intent, MenuItem } from '@blueprintjs/core'
import { Select } from '@blueprintjs/select'

export interface ISettings {
  printer?: TPrinter
  encoding: TEncoding
}

interface IProps {
  visible: boolean
  value: ISettings
  onConfirm: (value: ISettings) => void
  onCancel: () => void
}

const Settings: FC<IProps> = ({ visible, value, onCancel, onConfirm }) => {
  const [printerType, setPrinterType] = useState<TPrinterType>('LAN')
  const [printerAddress, setPrinterAddress] = useState<string>('')
  const [encoding, setEncoding] = useState<TEncoding>('GBK')

  const [printerAddressInvalid, setPrinterAddressInvalid] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      const { printer, encoding } = value;
      setEncoding(encoding);

      if (printer) {
        setPrinterType(printer.type);
        if (printer.type === 'LAN') {
          let address = printer.ip;
          if (printer.port) {
            address += `:${printer.port}`;
          }
          setPrinterAddress(address);
        } else {
          setPrinterAddress('');
        }
      } else {
        setPrinterType('LAN');
        setPrinterAddress('');
      }
    }
  }, [visible, value]);

  const getPrinter = (): TPrinter | undefined => {
    if (printerType === 'USB') {
      return { type: 'USB' }
    } else if (printerType === 'BLE') {

    } else if (printerType === 'LAN') {
      const [ip, portString] = printerAddress.split(':');
      if (!ipRegex({ exact: true }).test(ip)) {
        return;
      }
      if (typeof portString !== 'undefined') {
        const port = Number(portString);
        if (Number.isNaN(port) || port > 65535 || port < 1) {
          return;
        }
        return { type: 'LAN', ip, port };
      } else {
        return { type: 'LAN', ip };
      }
    }
  };

  const save = () => {
    const printer = getPrinter();
    onConfirm({ printer, encoding });
  };

  return (
    <Dialog
      icon="cog"
      title="Settings"
      isOpen={visible}
      onClose={onCancel}
    >
      <div className={Classes.DIALOG_BODY}>
        <FormGroup label="Printer" labelFor="printer-input">
          <InputGroup
            autoFocus
            id="printer-input"
            value={printerAddress}
            disabled={printerType !== 'LAN'}
            onChange={(e: any) => {
              setPrinterAddressInvalid(false);
              setPrinterAddress(e.target.value);
            }}
            intent={printerAddressInvalid ? Intent.DANGER : undefined}
            placeholder="IP Address, e.g. 192.168.1.100 or 192.168.1.100:9100"
            leftElement={(
              <Select
                filterable={false}
                items={['LAN', 'BLE', 'USB']}
                itemRenderer={(item: TPrinterType) => (
                  <MenuItem
                    active={item === printerType}
                    key={item}
                    text={item}
                    onClick={() => setPrinterType(item)}
                  />
                )}
                onItemSelect={() => {}}
              >
                <Button
                  minimal
                  rightIcon="caret-down"
                  text={printerType}
                />
              </Select>
            )}
          />
        </FormGroup>
        <FormGroup label="Encoding">
          <Select
            filterable={false}
            items={['GBK', 'BIG5', 'CP850', 'CP437']}
            itemRenderer={(item: TEncoding) => (
              <MenuItem
                active={item === encoding}
                key={item}
                text={item}
                onClick={() => setEncoding(item)}
              />
            )}
            onItemSelect={() => {}}
          >
            <Button
              rightIcon="caret-down"
              text={encoding}
            />
          </Select>
        </FormGroup>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button intent={Intent.PRIMARY} onClick={save}>Save</Button>
        </div>
      </div>
    </Dialog>
  )
}

export default Settings
