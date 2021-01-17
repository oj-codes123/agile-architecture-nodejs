
function StatusCode()
{
    this.success            = 0;
    this.fail               = -1;
    this.args_error         = -2;
    this.logined            = -3;
    this.not_logined        = -4;
    this.not_in_channel     = -5;
    this.no_channel         = -6;
    this.no_raise_hand      = -7;
    this.host_raise_hand    = -8;
    this.raise_hand_already = -9;
    this.host_not_online    = -10;
    this.stream_exist       = -11;
    this.not_in_handlist    = -12;
    this.no_stream_data     = -13;
    this.handlist_num_limit = -14;
    this.not_channel_host   = -15;
};

module.exports.status = new StatusCode();
