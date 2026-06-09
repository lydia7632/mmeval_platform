import React, { useEffect, useState } from 'react';
import { AutoComplete, Button, Col, Image, Modal, Row, Select, Space, Upload } from 'antd';
import { PlayCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useInterval } from 'ahooks';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '';

const LocalizationPage = ({ setLoading, messageApi }) => {
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState(null);
  const [methods, setMethods] = useState([]);
  const [currentMethod, setCurrentMethod] = useState(null);
  const [concept, setConcept] = useState('');
  const [inputImage, setInputImage] = useState('');
  const [outputImage, setOutputImage] = useState('');
  const [ramResult, setRamResult] = useState([]);
  const [modal, contextHolder] = Modal.useModal();

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const responseModels = await axios.get(`${API_BASE_URL}/models`);
        setModels(responseModels.data.models);
        const responseMethods = await axios.get(`${API_BASE_URL}/methods`);
        setMethods(responseMethods.data.methods);
        setCurrentMethod(responseMethods.data.methods[0]?.method_id || null);
      } catch (error) {
        console.error('fetch models or methods error:', error);
        messageApi.error('failed to fetch models or methods.');
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const processRAMPlus = async () => {
      if (!inputImage) {
        setRamResult([]);
        return;
      }
      try {
        const response = await axios.post(`${API_BASE_URL}/ram_process`, {
          image_id: inputImage,
        });
        const data = await response.data;
        setRamResult(data.ram_result);
        // messageApi.success('RAM+ processing completed.');
      } catch (error) {
        console.error('RAM+ processing error:', error);
        // messageApi.error('failed to process image with RAM+.');
      }
    };
    processRAMPlus();
  }, [inputImage]);

  useInterval(() => {
    const fetchCurrentModel = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/current_model`);
        setCurrentModel(response.data.model_id);
      } catch (error) {
        console.error('fetch current model error:', error);
        messageApi.error('failed to fetch current model.');
      }
    };
    fetchCurrentModel();
  }, 1000);

  const handleSwitchModel = async (modelId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/current_model`, { model_id: modelId });
      setCurrentModel(response.data.model_id);
      messageApi.success(`switched to model: ${models.find(item => item.model_id === response.data.model_id)?.name}`);
    } catch (error) {
      console.error('switch model error:', error);
      messageApi.error('failed to switch model.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (options) => {
    const { file } = options;
    setLoading(true);
    setInputImage('');
    setOutputImage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'json',
      });
      const data = await response.data;
      setInputImage(data.image_id);
      messageApi.success('image uploaded.');
    } catch (error) {
      console.error('upload error:', error);
      messageApi.error('failed to upload image.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!inputImage || !concept) {
      messageApi.error('please upload an image and enter a concept name.');
      return;
    }

    setLoading(true);
    setOutputImage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/process`, {
        image_id: inputImage,
        concept: concept,
        method_id: currentMethod,
      });
      const data = await response.data;
      setOutputImage(data.image_id);
      messageApi.success('explanation generated.');
    } catch (error) {
      console.error('generate error:', error);
      messageApi.error('failed to generate explanation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space className='w-full' direction='vertical' size='middle'>
      <div>
        <p className='mb-2'>Base Recognition Model</p>
        <Select
          style={{ width: 300 }}
          value={currentModel}
          onChange={value => handleSwitchModel(value)}
        >
          {models.map(item => (
            <Select.Option key={item.model_id} value={item.model_id}>
              {item.name}
            </Select.Option>
          ))}
        </Select>
      </div>

      <div>
        <p className='mb-2'>XAI Method for Localization</p>
        <Select
          style={{ width: 300 }}
          value={currentMethod}
          onChange={value => {
            setCurrentMethod(value);
            const warning = methods.find(item => item.method_id === value)?.warning;
            if (warning) {
              messageApi.warning(warning, 5);
            }
          }}
        >
          {methods.map(item => (
            <Select.Option key={item.method_id} value={item.method_id}>
              {item.name}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Upload
        name='file'
        multiple={false}
        maxCount={1}
        customRequest={handleUpload}
        showUploadList={false}
        accept='image/*'
      >
        <Button disabled={!currentModel || !currentMethod} icon={<UploadOutlined />}>Upload Image</Button>
      </Upload>

      <div>
        <p className='mb-2'>Concept Name</p>
        <AutoComplete
          style={{ width: 300 }}
          options={ramResult.map(item => ({ value: item }))}
          value={concept}
          onChange={value => setConcept(value)}
        />
      </div>

      <Button
        type='primary'
        disabled={!currentModel || !currentMethod || !inputImage || !concept }
        icon={<PlayCircleOutlined />}
        onClick={async () => {
          const warning = methods.find(item => item.method_id === currentMethod)?.warning;
          if (!warning || await modal.confirm({ title: 'WARNING', content: `${warning} Are you sure to proceed?`, okText: 'YES', cancelText: 'NO', okType: 'danger' })) {
            handleGenerate();
          }
        }}
      >
        Generate Explanation
      </Button>
      <div>{contextHolder}</div>

      <Row className='mt-6 max-w-7xl' gutter={16}>
        <Col span={12}>
          <p className='mb-2'>Input</p>
          {inputImage ? (
            <div className='w-full overflow-hidden' style={{ aspectRatio: '4/3' }}>
              <Image src={`${API_BASE_URL}/image/${inputImage}`} width='100%' height='100%' style={{ objectFit: 'contain' }} alt='Input' />
            </div>
          ) : (
            <div className='w-full border-2 border-dashed border-gray-300 dark:border-neutral-600 p-5 text-center flex items-center justify-center' style={{ aspectRatio: '4/3' }}>
              NO INPUT
            </div>
          )}
        </Col>
        <Col span={12}>
          <p className='mb-2'>Output</p>
          {outputImage ? (
            <div className='w-full overflow-hidden' style={{ aspectRatio: '4/3' }}>
              <Image src={`${API_BASE_URL}/image/${outputImage}`} width='100%' height='100%' style={{ objectFit: 'contain' }} alt='Output' />
            </div>
          ) : (
            <div className='w-full border-2 border-dashed border-gray-300 dark:border-neutral-600 p-5 text-center flex items-center justify-center' style={{ aspectRatio: '4/3' }}>
              NO OUTPUT
            </div>
          )}
        </Col>
      </Row>
    </Space>
  );
};

export default LocalizationPage;
