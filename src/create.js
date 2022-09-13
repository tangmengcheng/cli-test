// create 所有的逻辑
// create 功能是创建项目
// 拉取自己所有的项目列出来，让用户选，安装那个项目。选择完后 在显示所有的版本号
// 可能还需要用户配置一些数据，来结合渲染我的项目

// https://api.github.com/orgs/zhu-cli/repos  获取用户/组织下的所有仓库
/**
 * 1、获取项目列表
 */

const axios = require('axios')
const ora = require('ora')
const Inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')
const MetalSmith = require('metalsmith') // 遍历文件夹 找需不需要渲染
// consolidate 统一了 所有的模版引擎
let { render } = require('consolidate').ejs // 用render函数
const { promisify } = require('util')
let ncp = require('ncp')
let downloadGitRepo = require('download-git-repo') // 缺点：下载成功后 不返回promise
downloadGitRepo = promisify(downloadGitRepo) // 可以把异步的api转换成promise
ncp = promisify(ncp)
render = promisify(render)
const { downloadDirectory } = require('./constants')

// 获取项目列表https://blog.csdn.net/wang_yu_shun/article/details/120695481
const fetchRepoList = async () => {
    // const { data } = await axios.get('https://api.github.com/orgs/quick-cli/repos')
    const { data } = await axios.get('https://api.github.com/orgs/zhu-cli/repos')
    return data
}

// 获取tag列表
const fetchTagList = async (repo) => {
    const { data } = await axios.get(`https://api.github.com/repos/zhu-cli/${repo}/tags`)
    // const { data } = await axios.get(`https://api.github.com/repos/quick-cli/${repo}/tags`)
    return data
}

// 封装loading效果
// 高阶函数，第一个参数是处理loading的，第二个是处理函数参数的(柯里化思想)
const waitFnLoading = (fn, message) => async (...agrs) => {
    const spinner = ora(message)
    spinner.start() // 开始
    let result = await fn(...agrs);
    spinner.succeed() // 结束
    return result;
}

const download = async (repo, tag) => {
    let api = `zhu-cli/${repo}`
    if (tag) {
        api += `#${tag}`
    }
    // /user/xxx/.teample/repo
    const dest = `${downloadDirectory}/${repo}` // 下载的最终目录
    await downloadGitRepo(api, dest)
    return dest
}

module.exports = async (projectName) => {
    // console.log("xxxxxx", projectName)
    // const spinner = ora('fetching template ....')
    // 获取项目的所有模版
    // spinner.start() // 开始
    // let repos = await fetchRepoList();
    // spinner.succeed() // 结束
    let repos = await waitFnLoading(fetchRepoList, 'fetching template ....')()
    repos = repos.map(item => item.name)
    console.log("respos", repos) // [ 'vue-simple-template', 'vue-template' ]
    // 结果是获取到了，别人的项目有个loading的项目，让用户感知到正在下载，还有一个就是让用户选择哪个模版
    // 1. 在获取之前 显示loading,结束loading
    // 2. 完成后 选择模版 inquirer
    let { repo } = await Inquirer.prompt({
        name: 'repo', // 获取选择后的结果
        type: 'list', // list input checkbox
        message: 'pleace choise a teample to create project',
        choices: repos
    })
    console.log('repo', repo)

    // 通过当前选择的项目 拉取对应的版本
    let tags = await waitFnLoading(fetchTagList, 'fetching tags ....')(repo)
    // 需要传参，写成高阶函数
    tags = tags.map(item => item.name)
    console.log("tags", tags)
    let { tag } = await Inquirer.prompt({
        name: 'tag', // 获取选择后的结果
        type: 'list', // list input checkbox
        message: 'pleace choise a tag to create project',
        choices: tags
    })
    console.log('tag', tag, repo) // 拿到项目名和tag，然后就去拉取代码吗

    // 下载模版后，把模版放到一个临时目录里，以备后期使用
    // const result = await download(repo, tag)
    const result = await waitFnLoading(download, 'download template ....')(repo, tag)
    console.log('result', result) // 下载目录

    // 我拿到了下载的模版  之间拷贝当前执行的目录下即可 ncp 拷贝
    // 把template下的文件，拷贝到执行命令的目录下
    // 判断这个目录 项目名字是否已经存在，如果存在提示当前已经存在
    // 如果有ask.js文件
    if (!fs.existsSync(path.join(result, 'ask.js'))) {
        await ncp(result, path.resolve(projectName)) // path.resolve()当前执行的目录
    } else {
        // 复杂的
        // 1、让用户填信息
        await new Promise((resolve, reject) => {
            MetalSmith(__dirname) // 如果你传入路径，会默认会遍历当前路径下的src文件
                .source(result) // 所有的文件
                .destination(path.resolve(projectName)) // path.join(path.resolve(), projectName) === ß path.resolve(projectName)
                .use(async (files, metal, done) => {
                    // console.log("files", files) 所有的文件
                    let args = require(path.join(result, 'ask.js'))
                    console.log("args", args)
                    // let res = await Inquirer.prompt(args)
                    // console.log("res", res) // 用户填写的结果
                    done()
                })
                .use((files, metal, done) => {
                    done()
                })
                .build((err) => {
                    if (err) {
                        reject()
                    } else {
                        resolve()
                    }
                })
        })
        // 2、用用户填写的信息去渲染模版
    }
    

    // 复杂的模版 metalsmith只要是模版编译 都需要这个模块
    // 把git上的项目下载下来，如果有ask文件，就是一个复杂的模版，我们需要用户选择，选择后编译模版
    
}