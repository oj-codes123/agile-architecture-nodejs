const log4js = require('log4js');

class Logger
{
    constructor(){
        this.isInit = false;
    }

    Init(path){
        if(path==null){
            path = "logs/log";
        }
        log4js.configure({
            replaceConsole: true,
            pm2: true,
            appenders: {
                stdout: {
                    type: 'console'
                },
                fileLog: {
                    type: 'dateFile',
                    filename: path,
                    pattern: 'yyyy-MM-dd.log',
                    maxLogSize: 1024000000,
                    backups:30,
                    alwaysIncludePattern: true
                }
            },
            categories: {
                trace: { appenders: ['fileLog'], level: 'trace' },
                debug: { appenders: ['fileLog'], level: 'debug' },
                info: { appenders: ['fileLog'], level: 'info' },
                warn: { appenders: ['fileLog'], level: 'warn' },
                error: { appenders: ['fileLog'], level: 'error' },
                fatal: { appenders: ['fileLog'], level: 'fatal' },
                console: { appenders: ['stdout'], level: 'debug' },
                default: { appenders: ['fileLog'], level: 'debug' }
            }
        });
        this.isInit = true;
    }
};

module.exports.Logger = new Logger();

module.exports.console = function(message, ...args){
    return log4js.getLogger('console').console(message, args);
};

module.exports.trace = function(message, ...args){
    return log4js.getLogger('trace').trace(message, args);
};

module.exports.debug = function(message, ...args){
    return log4js.getLogger('debug').debug(message, args);
};

module.exports.info = function(message, ...args){
    return log4js.getLogger('info').info(message, args);
};

module.exports.warn = function(message, ...args){
    return log4js.getLogger('warn').warn(message, args);
};

module.exports.error = function(message, ...args){
    return log4js.getLogger('error').error(message, args);
};

module.exports.fatal = function(message, ...args){
    return log4js.getLogger('fatal').fatal(message, args);
};
