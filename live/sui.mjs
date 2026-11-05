// Sui testnet, for real: pay a one-time address, find it, then spend it in a sponsored transaction
// (the relayer owns the gas, the one-time address is the sender), so it never holds SUI for gas.
// Sui transfers carry no free-form bytes, so the announcement envelope travels beside the chain here
// (an app would use a Move event or an indexer); everything else is on chain.
import { randomBytes } from 'node:crypto'
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { Ed25519Keypair, Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { signSuiTransaction, sui } from '../dist/chains/sui/index.js'
import { announce, check, funderSecret, readAnnouncement, receiver, S, step } from './lib.mjs'

const NET = process.env.SUI_NET ?? 'devnet'
const AMOUNT = 100_000_000n // 0.1 SUI
const client = new SuiGrpcClient({ network: NET, baseUrl: `https://fullnode.${NET}.sui.io:443` })
const link = (digest) => `https://suiscan.xyz/${NET}/tx/${digest}`
const balance = async (owner) => BigInt((await client.getBalance({ owner })).balance.balance)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const relayer = Ed25519Keypair.fromSecretKey(funderSecret('sui', () => randomBytes(32)))
const relayerAddress = relayer.toSuiAddress()
console.log(`Sui ${NET}`)
step('relayer (owns the gas)', relayerAddress)
if ((await balance(relayerAddress)) < 300_000_000n) {
  try {
    await requestSuiFromFaucetV2({ host: getFaucetHost(NET), recipient: relayerAddress })
  } catch (e) {
    console.log(`  NEED FUNDS: faucet refused (${e.message.slice(0, 100)}). Fund ${relayerAddress}, then rerun.`)
    process.exit(2)
  }
  for (let i = 0; i < 20 && (await balance(relayerAddress)) < 300_000_000n; i++) await sleep(1500)
}
step('relayer balance', `${Number(await balance(relayerAddress)) / 1e9} SUI`)

// 1. A sender pays a fresh one-time address.
const r = receiver(sui)
const payment = S.createPayment(sui, r.meta, { memo: { name: 'Ada', note: 'Rent, live on Sui' } })
step('one-time address', payment.stealthAddress)
const pay = new Transaction()
const [coin] = pay.splitCoins(pay.gas, [AMOUNT])
pay.transferObjects([coin], payment.stealthAddress)
const paid = (await client.signAndExecuteTransaction({ transaction: pay, signer: relayer })).Transaction
await client.waitForTransaction({ digest: paid.digest })
step('paid 0.1 SUI', link(paid.digest))

// 2. The receiver finds it and opens the note.
const a = readAnnouncement(sui, announce(sui, payment, AMOUNT))
check('receiver finds it', S.findPayment(sui, r.view, a) === payment.stealthAddress)
check('receiver opens the sealed note', S.openPaymentMemo(sui, r.keys.viewingPrivateKey, a)?.note === 'Rent, live on Sui')
const spendKey = S.paymentPrivateKey(sui, r.keys, a.ephemeralPublicKey)
check('Sui SDK derives the same address', new Ed25519PublicKey(sui.scheme.publicKey(spendKey)).toSuiAddress() === payment.stealthAddress)
check('the chain holds the amount', (await balance(payment.stealthAddress)) === AMOUNT)

// 3. Spend, sponsored: the one-time address sends its coin; the relayer's coin pays the gas.
const home = Ed25519Keypair.generate().toSuiAddress()
const [held] = (await client.listCoins({ owner: payment.stealthAddress })).objects
const [gas] = (await client.listCoins({ owner: relayerAddress })).objects
const spend = new Transaction()
spend.setSender(payment.stealthAddress)
spend.setGasOwner(relayerAddress)
spend.setGasPayment([{ objectId: gas.objectId, version: gas.version, digest: gas.digest }])
spend.setGasBudget(10_000_000)
spend.transferObjects([spend.object(held.objectId)], home)
const bytes = await spend.build({ client })
const { signature: sponsorSignature } = await relayer.signTransaction(bytes)
const result = await client.executeTransaction({ transaction: bytes, signatures: [signSuiTransaction(spendKey, bytes), sponsorSignature] })
const done = result.Transaction ?? result.FailedTransaction
await client.waitForTransaction({ digest: done.digest })
step('spent, relayer paid the gas', link(done.digest))
check('the chain accepted both signatures', result.$kind === 'Transaction')
check('the one-time address is empty', (await balance(payment.stealthAddress)) === 0n)
check('the receiver’s own address got all 0.1 SUI', (await balance(home)) === AMOUNT)
