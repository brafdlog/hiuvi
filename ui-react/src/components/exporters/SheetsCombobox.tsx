import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import React, { useEffect, useState } from 'react';
import { Alert, Form } from 'react-bootstrap';
import { observer } from 'mobx-react-lite';
import { getAllSpreadsheets } from '../../eventsBridge';

interface SheetsComboboxProps {
  value: string;
  credentials: Credentials;
  changed: () => void;
}

const SheetsCombobox = ({ credentials, value, changed }:SheetsComboboxProps) => {

  const [userSpreadsheets, setUserSpreadsheets] = useState([]);
  const [spreadsheet, setSpreadsheet] = useState<string>(value);
  const [isNewSpreadsheet, setIsNewSpreadsheet] = useState(false);

  useEffect(() => {

    const getUserSpreadsheets = async () => {
      const data = await getAllSpreadsheets(credentials);
      setUserSpreadsheets(data);
    };

    getUserSpreadsheets();
  }, [credentials]);

  useEffect(() => {
    if (value && !userSpreadsheets.find(({ id }) => id === value)) {
      setIsNewSpreadsheet(true);
    } else {
      setIsNewSpreadsheet(false);
    }
  }, [value, userSpreadsheets]);

  const handleChange = (event) => {
    setSpreadsheet(event.target.value);
    changed();
  };

  return (
    <div>
        <Form.Select value={spreadsheet || ''} onChange={handleChange}>
          {userSpreadsheets.map(({ name, id }) => (
          <option key={id} value={id}>{name}</option>
          ))}
        </Form.Select>
      {isNewSpreadsheet && (
        <Alert variant="info" className='mt-3'>Will create a new spreadsheet</Alert>
      )}
    </div>
  );
};

export default observer(SheetsCombobox);