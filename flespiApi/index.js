const axios = require('axios');
const { flespiBackendUrl } = require('../constants/common');
const {
  getCreateDeviceConfig,
  setChanelSettings,
  configureTrackingSettings,
} = require('../constants/flespiConfigs');


const flespiAxios = axios.create({
  baseURL: flespiBackendUrl,
  headers: {
    Authorization: process.env.FLESPI_API_KEY,
    'Content-Type': 'application/json; charset=UTF-8',
  },
});


function createDevice(data) {
  return flespiAxios.post('devices', [getCreateDeviceConfig({
    ident: data.imei,
    phone: data.phoneNumber,
  })]);
}

function addDeviceToChanel(deviceId) {
  return flespiAxios.put(`devices/${deviceId}/settings/backend_server`, setChanelSettings);
}


function configureTracking(deviceId) {
  return flespiAxios.put(`devices/${deviceId}/settings/fixed_report_gl`, configureTrackingSettings);
}

function deleteDevice(deviceId) {
  return flespiAxios.delete(`devices/${deviceId}`);
}

module.exports = {
  createDevice,
  addDeviceToChanel,
  configureTracking,
  deleteDevice,
};
