import fetch from 'node-fetch';
import {ethers} from 'ethers';
import axios from 'axios';
import cryptoJS from 'crypto-js';
import { NewPrivatKeys, generateNonce,RPC_provider,sleep, sendRequestFetch} from '../../util/common.js';
import { PrivateKeys$136Wallets, PrivateKeys$18Wallets } from '../../util/privateKey.js';
import SocksProxyAgent from 'socks-proxy-agent';
import RPC from '../../config/runnerRPC-1.json' assert { type: 'json' };
import fakeUa from 'fake-useragent';
import Web3 from 'web3';
// import {sendRequestFetch} from '../../util/common.js';
import {HttpsProxyAgent} from 'https-proxy-agent';
import pLimit from 'p-limit';

//provider链接
const provider=new ethers.JsonRpcProvider(RPC.nowchain);
const QIANDAO_URL='https://apiztestnet.nowchain.co/api/v1/user/auth/signin';
const status_checkin_URL='https://apiztestnet.nowchain.co/api/v1/user/point/status-checkin';
const swap_create_URL='https://apiztestnet.nowchain.co/api/v1/user/swap/create';
const bridge_create_URL='https://apiztestnet.nowchain.co/api/v1/user/bridge/create';
const liquidity_add_URL='https://apiztestnet.nowchain.co/api/v1/user/liquidity/add';



//header获取
  /**
   * 钱包发送交易程序，简化程序代码；
   * maxRetries为最大的尝试次数，默认是3次；
   * timeout为最大的时间周期,默认是10s，合约交互时间较长
   */

async function walletSendtxData(wallet,txData,maxRetries = 4,timeout=50000){
let retries = 0;
let success = false;
while (retries < maxRetries) {
    try {
        const txPromise = wallet.sendTransaction(txData);
        const transactionResponse= await Promise.race([
            txPromise,
            new Promise((_,reject)=>setTimeout(()=>reject(new Error('TimeOut')),timeout))                
        ]);
        const receipt = await transactionResponse.wait();
        if (receipt.status===1) {
            console.log("交易sucess，hash是:",receipt.hash); 
            return receipt.hash
            retries=maxRetries;
            success=true;
        }else{
            throw new Error(`交易hash是failed，从新进行交易`);              
        }
        await sleep(2)         
        return 0;
    } catch (error) {
        // console.error(`Error occurred: ${error.message}`);//暂时屏蔽掉错误信息
        retries++;
        console.error(`开始尝试第${retries}次,${error.message}`);
        console.error(`开始尝试第${retries}次`);
        if(retries >= maxRetries){
            console.log(`尝试${maxRetries}次仍然失败，退出交易`);
            // console.error(`kayakfinance领取测试币发生错误,开始尝试第${retries}次`);
            return 1;
            // throw new Error('Max retries exceeded'); 
        }
        await sleep(1);//等待3s时间
    }         
}
}

function getHeaders(userAgent=''){
    let options={
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://testnet.nowchain.co',
        'priority': 'u=1, i',
        'referer': 'https://testnet.nowchain.co/',
        'sec-ch-ua': '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': userAgent
    }
    return options;
};

//sign
async function walletSignin(wallet,headers,agent) {
    let data_TX={
        ref:"",
        wallet:wallet.address
    };    
    let config={
        method:'POST',
        headers:headers,
        agent:agent,
        body:JSON.stringify(data_TX),
    }
    // console.log(config);
    
    //获取钱包账户的token
    try {
        let response= await sendRequestFetch(QIANDAO_URL,config)
        if (response.status===200) {
            let token=await response.json();
            console.log(`登录完成。。。`);
            // console.log(token); 
            const data=token.data.token;
            headers.authorization='Bearer '+data;
            return data;
        }
    } catch (error) {
        console.error('签到出现错误信息是:', error.message);
    }
}
// 每日签到
async function daliyCheckIn(wallet,headers,agent) {
    let hash_tx=''
    try{
        const txData = {
            to: '0x3144b4C02b0671F301370f3f19Bc50ee7224FF20',                                                                                      
            data: `0x183ff085`,
            value: 0
            // nonce:await provider.getTransactionCount(to_address),
        };
        hash_tx=await walletSendtxData(wallet,txData);         
    } catch (error) {
        console.error('跨链转账22222222222发生错误:', error.message);
    } 
    await sleep(1) 
    let config={
        method:'POST',
        headers:headers,
        agent:agent,
        body:JSON.stringify({hash:hash_tx}),
    }
    // console.log(config);
    
    //获取钱包账户的token
    try {
        let response= await sendRequestFetch(status_checkin_URL,config)
        if (response.status===200) {
            let token=await response.json();
            console.log(token.message);
        }
    } catch (error) {
        console.error('签到出现错误信息是:', error.message);
    }

}

// 领取水资源
async function daliyFaucet(headers,agent) {
    const pairs=[{number:4,token:'NOW'},{number:5,token:'BNB'},{number:6,token:'USDT'},{number:7,token:'ETH'},{number:12,token:'BTC'}]
    for (let index = 0; index < pairs.length; index++) {
        const url = `https://apiztestnet.nowchain.co/api/v1/user/faucet/handle/${pairs[index].number}`;
        let config={
            method:'POST',
            headers:headers,
            agent:agent,
            body:JSON.stringify({ }),
        }
        try {
            let response= await sendRequestFetch(url,config)
            if (response.status===200) {
                let token=await response.json();
                console.log(token.message);
            }
        } catch (error) {
            console.error('签到出现错误信息是:', error.message);
        } 
    }
}

// swap过程
async function daliySwap(wallet,headers,agent) {
    let hash_tx=''
    let value=Math.round(Math.random()*100)/5000;
    if (value<=0.005) {
        value=0.005;
    }
    try{
        const txData = {
            to: '0x15168Df90e61B3720c3D41474B48C2193eD8d451',                                                                                      
            data: `0x`,
            value: ethers.parseEther(value.toString())
            // nonce:await provider.getTransactionCount(to_address),
        };
        hash_tx=await walletSendtxData(wallet,txData);         
    } catch (error) {
        console.error('跨链转账22222222222发生错误:', error.message);
    } 
    await sleep(1) 
    let config={
        method:'POST',
        headers:headers,
        agent:agent,
        body:JSON.stringify({
            amount:value.toString(),
            hash:hash_tx,
            pair_id:2
        }),
    }
    // console.log(config);
    
    //获取钱包账户的token
    try {
        let response= await sendRequestFetch(swap_create_URL,config)
        if (response.status===200) {
            let token=await response.json();
            console.log(token.message);
        }
    } catch (error) {
        console.error('签到出现错误信息是:', error.message);
    }

}

// bridge过程
async function daliyBridge(wallet,headers,agent) {
    let hash_tx=''
    let value=Math.round(Math.random()*100)/5000;
    if (value<=0.005) {
        value=0.005;
    }
    try{
        const txData = {
            to: '0x15168Df90e61B3720c3D41474B48C2193eD8d451',                                                                                      
            data: `0x`,
            value: ethers.parseEther(value.toString())
            // nonce:await provider.getTransactionCount(to_address),
        };
        hash_tx=await walletSendtxData(wallet,txData);         
    } catch (error) {
        console.error('跨链转账22222222222发生错误:', error.message);
    } 
    await sleep(1) 
    let config={
        method:'POST',
        headers:headers,
        agent:agent,
        body:JSON.stringify({
            amount:value.toString(),
            hash:hash_tx,
            coin_pair_id:4
        }),
    }
    // console.log(config);
    
    //获取钱包账户的token
    try {
        let response= await sendRequestFetch(bridge_create_URL,config)
        if (response.status===200) {
            let token=await response.json();
            console.log(token.message);
        }
    } catch (error) {
        console.error('签到出现错误信息是:', error.message);
    }

}

// LP过程
async function daliyLP(wallet,headers,agent) {
    let hash_tx=''
    const per=87.783787;
    let value=Math.round(Math.random()*100)/5000;
    if (value<=0.005) {
        value=0.005;
    }
    const USDT=(value/per).toFixed(6);
    try{
        const txData = {
            to: '0xb0958D2d8613013C6B8315172ca354e2518cB06a',                                                                                      
            data: `0x`,
            value: ethers.parseEther(value.toString())
            // nonce:await provider.getTransactionCount(to_address),
        };
        hash_tx=await walletSendtxData(wallet,txData);         
    } catch (error) {
        console.error('跨链转账22222222222发生错误:', error.message);
    } 
    await sleep(1) 
    let config={
        method:'POST',
        headers:headers,
        agent:agent,
        body:JSON.stringify({
            amount:value.toString(),
            hash:hash_tx,
            coin_id:4,
            id:2
        }),
    }
    // console.log(config);
    
    //获取钱包账户的token
    try {
        let response= await sendRequestFetch(liquidity_add_URL,config)
        if (response.status===200) {
            let token=await response.json();
            console.log(token.message);
        }
    } catch (error) {
        console.error('签到出现错误信息是:', error.message);
    }

}
const main=async(privateKeys,thread=1)=>{
    console.log(`当前时间是${new Date()}`);
    if (thread===1) {
        //单线成模式
        console.log(`单线程模式`);
        for (let index =0; index <privateKeys.length; index++) {
            let agent = new HttpsProxyAgent(RPC.bytioproxy);
            // let agent='';
            let userAgent = fakeUa();
            let headers=getHeaders(userAgent);
            let randTime=Math.floor(Math.random() * (10))
            let wallet=new ethers.Wallet(privateKeys[index],provider);
            console.log(`第${index+1}个钱包${wallet.address}`);
            await walletSignin(wallet,headers,agent);
            await sleep(randTime);
            await daliyFaucet(headers,agent)
            await sleep(randTime);
            await daliyCheckIn(wallet,headers,agent);  
            await sleep(randTime);
            await daliySwap(wallet,headers,agent)
            await sleep(randTime);
            await daliyBridge(wallet,headers,agent)
            await sleep(randTime);
            await daliyLP(wallet,headers,agent)
            await sleep(randTime);
        }
    }else if(thread===2){
        const CONCURRENCY_LIMIT=20;//设置多线程
        console.log(`多线程模式，同时运行${CONCURRENCY_LIMIT}个`);
        const limit = pLimit(CONCURRENCY_LIMIT);
        const tasks=privateKeys.map(privateKey=>
            limit(async ()=>{
                let wallet=new ethers.Wallet(privateKey,provider);
            // let wallet=new ethers.Wallet(privateKey,await RPC_provider(ethrpc));
                console.log(`地址：${wallet.address}`);
                let agent = new HttpsProxyAgent(RPC.bytioproxy);//RPC.bytioproxy设置成自己的代理即可
                let userAgent = fakeUa();
                let headers=getHeaders(userAgent);
                let randTime=Math.floor(Math.random() * (10))
                // let wallet=new ethers.Wallet(privateKeys[index],provider);
                // console.log(`第${index+1}个钱包${wallet.address}`);
                await walletSignin(wallet,headers,agent);
                await sleep(randTime);
                await daliyFaucet(headers,agent)
                await sleep(randTime);
                // await daliyCheckIn(wallet,headers,agent);  
                // await sleep(randTime);
                await daliySwap(wallet,headers,agent)
                await sleep(randTime);
                await daliyBridge(wallet,headers,agent)
                await sleep(randTime);
                await daliyLP(wallet,headers,agent)
                await sleep(randTime);
            })
         );
         
        await Promise.allSettled(tasks)
        .then(()=>
            console.log(`任务已完成`)
        )
        .catch(error=>{
            console.error(error.message);
        });
    }

}
main(PrivateKeys$136Wallets.slice(0),2)
