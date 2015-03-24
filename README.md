# gulp-xinclude
gulp-xinclude指令解析工具库，基于gulp构建工具。
该指令库支持在html中编写指令，然后使用该工具库进行处理后，得到对应的真实html，这样可以使源码编写过
程中更加简洁，对静态html的服用及维护都很有好处。
  1. classes表示引用的是js文件；
  2. rule表示引用的一组规则，规则文件可通过rules参数进行传递；
  3. template表示引用的是一个html片段，路径代表的片段所在位置；
  4. file表示引用的是一个文件，文件扩展名可以岁.html/.js/.css；
  5. stylesheet表示引用的是一个css样式文件，无需指定扩展名；
  6. 每个指令都支持引用多个文件或规则，多个规则之间可使用“;”进行分割；
  7. 表达式中可以使用{expression}的方式指定路径中需要替换成对应变量的表达式，该表达式中替换的变量通过xinclude函数的参数传入。
  
例如：
<!--xinclude file="path/to/file.ext;{somevarible}/path/to/file2.ext" -->

<!--xinclude classes="path/to/file" -->

<!--xinclude stylesheet="path/to/file" -->

<!--xinclude rule="rule1;rule2" -->

<!--xinclude template="path/to/file;path/to/file" -->

作为gulp插件，使用方式：

npm命令安装：

npm install gulp-xinclude

引用及使用

var xinclude = require("gulp-xinclude");

var xincludeConf = {

  rules: "rulefilepath",  //指定rule的配置文件路径
  
  somevarible: "用于替换{varible}表达式的变量"
  
}

gulp.task("resolve-xinclude", function(){

    gulp.src(paths)

            .pipe(xinclude(xincludeConf))
            
            .pipe(gulp.dest(somePath));
            
});

执行gulp命令

gulp resolve-xinclude
