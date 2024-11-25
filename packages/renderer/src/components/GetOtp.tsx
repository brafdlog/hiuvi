import React, { useEffect, useState } from 'react';
import { Button, FormControl, Modal } from 'react-bootstrap';
import { observer } from 'mobx-react-lite';
import { useConfigStore } from '../store/ConfigStore';
import { sendOTPResponse } from '#preload';

const GetOtp = () => {
  const configStore = useConfigStore();
  const [modalStatus, setModalStatus] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');

  const closeModal = (inputText = '') => {
    sendOTPResponse(inputText);
    setModalStatus(false);
  };

  useEffect(() => {
    if (configStore.getOtp !== undefined) {
      setModalStatus(configStore.getOtp);
    }
  }, [configStore.getOtp]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };

  const sendInput = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    closeModal(inputText);
  };

  if (!configStore.getOtp) {
    return null;
  }

  return (
    <Modal show={modalStatus} onHide={closeModal}>
      <Modal.Header closeButton></Modal.Header>
      <Modal.Body>
        <FormControl
          type="text"
          placeholder="Enter text here"
          value={inputText}
          onChange={handleInputChange}
          className="mb-3"
        />
        <Button variant="dark" name="send-report" type="submit" onClick={sendInput}>
          הכנס קוד
        </Button>
      </Modal.Body>
    </Modal>
  );
};

export default observer(GetOtp);
