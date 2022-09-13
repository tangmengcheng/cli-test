const program = require('commander')
const { version } = require('./constants')
const path = require('path')
// console.log(process.argv) // process.argv当前进程里的参数中
// 多个命令，又比较类似，我们就要写一个功能区循环它，配置一个命令的集合

const mapActions = {
    create: {
        alias: 'c',
        description: 'create a project',
        examples: [
            'tmc-cli create <projectName>'
        ]
    },
    config: {
        alias: 'conf',
        description: 'config project variable',
        examples: [
            'tmc-cli config set <k> <v>',
            'tmc-cli config get <key>'
        ]
    },
    '*': {
        alias: '',
        description: 'command not found',
        examples: []
    }
}
// Reflect.ownKeys() 循环对象，和Object.keys()功能类似，但它支持循环symblo
Reflect.ownKeys(mapActions).forEach(action => {
    program
        .command(action) // 配置命令的名称
        .alias(mapActions[action].alias) // 命令的别名
        .description(mapActions[action].description) // 命令对应的描述
        .action(() => {
            if (action === '*') { // 访问不到对应的命令，就打印找不到命令
                console.log(mapActions[action].description)
            } else { // 分配任务，分配到每个文件
                console.log(action)
                // 要写很多个if else, 所以我们可以让执行的命令和文件一一对应的,拿到这个函数，然后执行
                // tmc-cli create xxx 【node, tmc-cli, create, xxxx】
                require(path.resolve(__dirname, action))(...process.argv.slice(3))
            }
        })
})

// 监听用户的help事件
program.on('--help', () => {
    console.log('\n Examples:')
    Reflect.ownKeys(mapActions).forEach(action => {
        mapActions[action].examples.forEach(example => {
            console.log('  ' + example)
        })
    })
})


program.version(version).parse(process.argv) // 解析用户传递的参数