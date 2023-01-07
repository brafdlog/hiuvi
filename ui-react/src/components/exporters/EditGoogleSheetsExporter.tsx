import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Alert, Button, Card, Form
} from 'react-bootstrap';
import { Credentials } from 'google-auth-library/build/src/auth/credentials';
import {
  googleLogin,
  validateGoogleToken,
  createSpreadsheet,
} from '../../eventsBridge';
import {
  Exporter,
  GoogleSheetsConfig,
  OutputVendorName,
} from '../../types';
import SheetsCombobox from './SheetsCombobox';
import styles from './EditGoogleSheetsExporter.module.css';
import { StoreContext } from '../../Store';

enum Status {
  LOADING,
  LOGGED_IN,
  LOGIN,
  ERROR,
}

type EditGoogleSheetsExporterProps = {
  handleSave: (exporter: Exporter) => Promise<void>;
  exporter: Exporter;
};

function EditGoogleSheetsExporter({
  exporter,
  handleSave,
}: EditGoogleSheetsExporterProps) {
  const [status, setStatus] = useState<Status>(Status.LOGIN);
  const [errorMessage, SetErrorMessage] = useState();
  const [readyToSave, setReadyToSave] = useState(false);

  // const dataToReturn = setupExporterConfigForm(OutputVendorName.GOOGLE_SHEETS);
  const [exporterConfig, setExporterConfig] = useState<GoogleSheetsConfig>(
    exporter as GoogleSheetsConfig
  );

  const store = useContext(StoreContext);

  useEffect(() => {
    const validate = async () => {
      // eslint-disable-next-line camelcase
      const valid = await validateGoogleToken(exporterConfig?.options?.credentials);
      setStatus(valid ? Status.LOGGED_IN : Status.LOGIN);
    };

    try {
      // eslint-disable-next-line camelcase
      if (exporterConfig?.options?.credentials?.id_token !== '') {
        validate();
      }
    } catch (ex) {
      setStatus(Status.ERROR);
      SetErrorMessage(ex.message);
    }
  }, [exporterConfig.options.credentials]);

  const login = async () => {
    try {
      setStatus(Status.LOADING);

      const credentials: Credentials = await googleLogin();

      const updatedExporter = {
        ...exporter,
        options: { ...exporter.options, credentials: { ...credentials } },
      };

      await store.updateExporter(updatedExporter);

      setExporterConfig((prevExport) => ({
        ...prevExport,
        options: { ...prevExport.options, credentials },
      }));

      setStatus(Status.LOGGED_IN);
    } catch (ex) {
      setStatus(Status.ERROR);
      SetErrorMessage(ex);
    }
  };

  const save = async () => {
    // Todo: the line below was copied from the VUE code, should be refactored
    const isNewSheet = exporterConfig.options.spreadsheetId.length < 30;
    if (isNewSheet) {
      setStatus(Status.LOADING);
      const title = exporterConfig.options.spreadsheetId;
      const spreadsheetId = await createSpreadsheet(
        title,
        exporterConfig.options.credentials
      );
      setExporterConfig((prevExport) => ({
        ...prevExport,
        options: { ...prevExport.options, spreadsheetId },
      }));

      const updatedExporter = { ...exporter };

      await store.updateExporter(updatedExporter);

      setStatus(Status.LOGGED_IN);
    }
  };

  const handleActiveChange = (e) => {
    setExporterConfig((prevExport) => ({
      ...prevExport,
      active: e.target.checked
    }));

    setReadyToSave(true);
  };

  const handleSheetChanged = () => {
    setReadyToSave(true);
  };

  return (
    <div className={styles.container}>
      {status === Status.LOGIN && (
        <Button variant="dark" onClick={login}>
          Login to Google
        </Button>
      )}
      {status === Status.ERROR && (
        <Alert variant="danger">{errorMessage}</Alert>
      )}
      {status === Status.LOGGED_IN && (
        <>
          <Card className={styles.card}>
            <Card.Body className={styles.cardBody}>
              <Form className={styles.form}>
                <Form.Check
                  type="checkbox"
                  checked={exporterConfig?.active}
                  onChange={handleActiveChange}
                  label="Active"
                  className="mb-3"
                />
                <SheetsCombobox
                  credentials={exporterConfig?.options?.credentials}
                  value={exporterConfig.options.spreadsheetId}
                  changed={handleSheetChanged}
                />
                <Button
                  disabled={!readyToSave}
                  variant="dark"
                  onClick={save}
                  className="mt-3"
                >
                  Save
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
    // <p>ההגדרות של גוגל שיטס עוד לא זמינות בממשק החדש. נא לעבור לממשק הישן כדי להגדיר</p>
  );
}

export default observer(EditGoogleSheetsExporter);