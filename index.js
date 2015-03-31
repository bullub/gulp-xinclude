/**
 * Created by bullub
 * 用于解释xinclude指令
 */
var gutil = require("gulp-util"),
    through2 = require("through2"),
    PluginError = gutil.PluginError,
    path = require('path'),
    fs = require('fs'),
    reg$$Global = /<!--\s*xinclude\s+([^=]+)\s*=\s*['"]([^'"]+)['"]\s*-->/g,
    reg$$ = /<!--\s*xinclude\s+(\w+)\s*=\s*['"]([^'"]+)['"]\s*-->/,
    _options,
    projectBase = path.join(__dirname, "../.."),
    basePath,
    rules,
    resolvers;

module.exports = function(options) {
    _options = options;
    basePath = projectBase + "/" +_options.ENV;
    rules = require(projectBase + "/" + options.rules);
    return through2.obj(xinclude);
}

/**
 * 所有的解析器
 * @type {{classes: resolveScripts, template: resolveTemplate, file: resolveFile, rule: resolveFile, stylesheet: resolveStylesheet}}
 */
resolvers = {
    classes: resolveScripts,
    template: resolveTemplate,
    file: resolveFile,
    rule: resolveFile,
    stylesheet: resolveStylesheet
};

/**
 * gulp函数入口
 * @param file
 * @param encoding
 * @param callback
 */
function xinclude(file, encoding, callback) {
    if (!file) {
        throw new PluginError('gulp-xinclude', '文件为没有对应的文件');
    }

    if(file.isStream()) {
        throw new PluginError('gulp-xinclude', '只支持html文件中<!--xinclude command=xxx-->类型指令。');
    }

    processFile(file, encoding)
    this.push(file);
    callback();
}
/**
 * 处理当前文件，主要是解析出所有指令，并根据不同指令调用不同处理器
 * @param file
 * @param encoding
 * @returns {*}
 */
function processFile(file, encoding) {
    var fileContent = file.contents.toString(encoding),
        matches = fileContent.match(reg$$Global),
        expression,
        tempRegResults,
        name,
        value,
        replaceStr;

    if(null === matches) {
        return file;
    }
    for(var i = 0, len = matches.length; i < len; i ++) {
        expression = matches[i];
        tempRegResults = expression.match(reg$$);
        name = tempRegResults[1];
        value = tempRegResults[2];

        replaceStr = (resolvers[name] || loop)(file, valueProcess(name, value));
        //替换表达式的值为应该替换的那一部分
        fileContent = fileContent.replace(expression, replaceStr.replace("$", "$$$$"));
    }

    file.contents = new Buffer(fileContent);
    return file;
}
/**
 * 根据指令名对指令值进行相应的处理
 * @param {String} name 指令名，可以是classes, stylesheet, rule, file, template
 * @param {String} value 这些指令对应的值
 * @return {Array} 一个路径数组，里面存放了所有要处理的路径,是基于根路径的路径
 */
function valueProcess(name, value) {
    //首先将传入的value表达式的值进行分好分割，得到每一个路径表达式
    var tempResults = value.split(';'),
        results = [],
        ruleList,
        ruleItem;
    switch (name) {
        case 'stylesheet':
            for(var i = 0, len = tempResults.length; i < len; i ++) {
                results.push(_injectVaribles(path.join(basePath, _options.MODULE, 'assets/css', tempResults[i]+".css")));
            }
            break;
        case 'rule':

            for(var i = 0, len = tempResults.length; i < len; i ++) {
                //拿到当前rule的规则，是一个数组
                ruleList = rules[tempResults[i]] || [];
                for(var j = 0, jLen = ruleList.length; j < jLen; j ++) {
                    //拿到规则声明中的每一项
                    ruleItem = ruleList[j];
                    //根据规则名，递归解析当前规则，实现规则引规则
                    Array.prototype.push.apply(results, valueProcess(ruleItem.name, ruleItem.value.join(';')));
                }
            }
            break;
        case 'file':
            for(var i = 0, len = tempResults.length; i < len; i ++) {
                results.push(_injectVaribles(path.join(basePath, tempResults[i])));
            }
            break;
        case 'template':
            for(var i = 0, len = tempResults.length; i < len; i ++) {
                results.push(_injectVaribles(path.join(basePath, _options.MODULE, 'modules/template', tempResults[i] + ".html")));
            }
            break;
        case 'classes':
            for(var i = 0, len = tempResults.length; i < len; i ++) {
                results.push(_injectVaribles(path.join(basePath, _options.MODULE, 'modules/classes', tempResults[i] + ".js")));
            }
            break;
        default :
            throw new PluginError('gulp-xinclude', "没有对应的命令：[" + name + "]");
    }
    return results;
}

/**
 * 解析样式表引用
 * @param file 当前引用指令的文件
 * @param pathes 指令中解析出来的绝对路径数组
 * @returns {string} 应该替换成的字符串
 */
function resolveStylesheet(file, pathes) {
    var filePath = file.path,
        linkStr = '';

    for(var i = 0, len = pathes.length; i < len; i ++) {
        linkStr += '<link rel="stylesheet" href="' + path.relative(path.dirname(filePath), pathes[i]) + '"/>\r\n';
    }

    return linkStr;
}

/**
 * 解析解析template，也就是部分内容替换的情况
 * @param file 当前引用指令的文件
 * @param pathes 指令中解析出来的绝对路径数组
 * @returns {string} 应该替换成的字符串
 */
function resolveTemplate(file, pathes) {
    var filePath = file.path,
        templateContent = '';

    for(var i = 0, len = pathes.length; i < len; i ++) {
        templateContent += fs.readFileSync(pathes[i], {encoding: 'utf-8'}) + "\r\n";
    }

    return templateContent;
}
/**
 * 解析js脚本
 * @param file 当前引用指令的文件
 * @param pathes 指令中解析出来的绝对路径数组
 * @returns {string} 应该替换成的字符串
 */
function resolveScripts(file, pathes) {
    var filePath = file.path,
        scriptsStr = '';

    for(var i = 0, len = pathes.length; i < len; i ++) {
        scriptsStr += '<script defer src="' + path.relative(path.dirname(filePath), pathes[i]) + '"></script>\r\n';
    }

    return scriptsStr;
}


/**
 * 解析文件，所有文件路径都必须以项目中src目录的路径为准
 * @param file 当前引用指令的文件
 * @param pathes 指令中解析出来的绝对路径数组
 * @returns {string} 应该替换成的字符串
 */
function resolveFile(file, pathes) {
    var strResult = '';

    for(var i = 0, len = pathes.length; i < len; i ++) {
        extName = path.extname(pathes[i]);
        switch (extName) {
            case '.js':
                strResult += resolveScripts(file, [pathes[i]]);
                break;
            case '.css':
                strResult += resolveStylesheet(file, [pathes[i]]);
                break;
            case '.html':
                strResult += resolveTemplate(file, [pathes[i]]);
                break;
            default :
                throw new PluginError("gulp-xinclude", "暂不支持类型[" + extName + "]的文件");
        }
    }
    return strResult;
}
/**
 * 将路径中的变量引用注入，{}
 * @param value 路径表达式
 * @returns {string} 文件的真是路径
 * @private
 */
function _injectVaribles(value) {
    return value.replace(/\{([\w]+)\}/g, function(exp, varibleName, index, val) {
        return _options[varibleName];
    });
}
/**
 * 只是一种类似空函数的功能
 * @param file
 * @param fileContent
 * @returns {*}
 */
function loop(file, fileContent){
    return fileContent;
}