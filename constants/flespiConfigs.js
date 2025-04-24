const deviceTypeId = 377; // GL300M
const chanelHost = process.env.FLESPI_API_CHANEL_HOST;
const chanelPort = Number(process.env.FLESPI_API_CHANEL_PORT);
// GTSTT - position
// GTINF - battery status
// GTFRI - position and optionally battery status (usually in the last message in a batch)
const saveMessagesWithReportCodes = ['GTFRI'];

const getCreateDeviceConfig = (data) => ({
  configuration: {
    ident: data.ident,
    phone: data.phone,
  },
  device_type_id: deviceTypeId,
});


const setChanelSettings = {
  properties: {
    buffer_mode: 1,
    heartbeat: { enable: false },
    host: chanelHost,
    port: chanelPort,
    report_mode: 3,
    sack_enable: true,
  },
  address: 'sms',
};

const configureTrackingSettings = {
  properties: {
    check_interval: 180,
    corner: 0,
    end_time: '0000',
    mode: {
      send_interval: 300,
      type: 1,
    },
    movement: {
      enable: false,
    },
    start_time: '0000',
    without_gps: false,
  },
  address: 'connection',
};


module.exports = {
  getCreateDeviceConfig,
  setChanelSettings,
  configureTrackingSettings,
  saveMessagesWithReportCodes,
};
