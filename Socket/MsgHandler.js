
class MsgHandler
{
    constructor(){
    }

    Init(){ }

    OnConnected(conns, conn, cmd, args) { }
    OnMessage(conns, conn, cmd, args) { }
    OnClose(conns, conn, cmd, args) { }
    OnError(conns, conn, cmd, args) { }
};

module.exports = MsgHandler;
