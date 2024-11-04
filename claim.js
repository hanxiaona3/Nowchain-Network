import { ethers } from 'ethers';
import { PrivateKeys$18Wallets, PrivateKeys$136Wallets } from '../../util/privateKey.js';
import { RPC_provider,formHexData, sleep,walletContract} from '../../util/common.js';
import RPC from '../../config/runnerRPC-1.json' assert { type: 'json' };
import unichain from './Contract/unichain.json' assert { type: 'json' };

const provider=new ethers.JsonRpcProvider(RPC.nowchain);//设置链接PRC

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


async function bridge_to(wallet){
    const Interacted_contract_Token='0x3144b4C02b0671F301370f3f19Bc50ee7224FF20';
    // let m=ethers.parseEther((randdata*0.75).toString())
    let value=(Math.random() * (0.04 - 0.02) + 0.01).toFixed(4);
    console.log(value);

    try{
        const txData = {
            to: Interacted_contract_Token,                                                                                      
            data: `0x183ff085`,
            value: ethers.parseEther(value.toString())
            // nonce:await provider.getTransactionCount(to_address),
        };
        await walletSendtxData(wallet,txData);         
    } catch (error) {
        console.error('跨链转账22222222222发生错误:', error.message);
    } 
    await sleep(1) 
    
}
const main=async(privateKeys)=>{

    for (let index = 0; index <privateKeys.length; index++) {//PrivateKeys$18Wallets.length 
        let wallet=new ethers.Wallet(privateKeys[index],provider);
        console.log(`第${index+1}个钱包，地址：${wallet.address}`);
        await bridge_to(wallet);    
    }
}

main(PrivateKeys$18Wallets.slice(0))


//  try {
//     const contract=new ethers.Contract(unichain.address,unichain.abi,wallet);
//     const txResponse= contract.bridgeETHTo(wallet.address,200000,'0x7375706572627269646765');
//     await walletContract(txResponse);
    
// } catch (error) {
//     console.error(`Error occurred: ${error.message}`);
// }  