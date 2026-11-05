// Aptos, for real: pay a one-time address, find it, then spend it in a fee-payer transaction (the
// relayer pays the gas, the one-time address signs as sender), so it never holds APT for gas.
// Aptos transfers carry no free-form bytes, so the announcement envelope travels beside the chain here
// (an app would emit a Move event or use an indexer); everything else is on chain.
import { randomBytes } from 'node:crypto'
import {
  Account,
  AccountAuthenticatorEd25519,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Ed25519PublicKey,
  Ed25519Signature,
  FeePayerRawTransaction,
  generateSigningMessageForTransaction,
  Network,
} from '@aptos-labs/ts-sdk'
import { aptos as chain, aptosSigningMessage, signAptosTransaction } from '../dist/chains/aptos/index.js'
import { announce, check, funderSecret, readAnnouncement, receiver, S, step } from './lib.mjs'

const NET = process.env.APTOS_NET ?? 'devnet'
const AMOUNT = 10_000_000 // 0.1 APT
const client = new Aptos(new AptosConfig({ network: NET === 'devnet' ? Network.DEVNET : Network.TESTNET }))
const link = (hash) => `https://explorer.aptoslabs.com/txn/${hash}?network=${NET}`
const balance = async (accountAddress) => {
  try {
    return await client.getAccountAPTAmount({ accountAddress })
  } catch {
    return 0
  }
}
const transfer = (sender, to, withFeePayer = false) =>
  client.transaction.build.simple({ sender, withFeePayer, options: { maxGasAmount: 20_000 }, data: { function: '0x1::aptos_account::transfer', functionArguments: [to, AMOUNT] } })

const relayer = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(funderSecret('aptos', () => randomBytes(32))) })
console.log(`Aptos ${NET}`)
step('relayer (pays the gas)', relayer.accountAddress.toString())
if ((await balance(relayer.accountAddress)) < 30_000_000) {
  try {
    await client.fundAccount({ accountAddress: relayer.accountAddress, amount: 100_000_000 })
  } catch (e) {
    console.log(`  NEED FUNDS: faucet refused (${String(e.message).slice(0, 100)}). Fund ${relayer.accountAddress}, then rerun.`)
    process.exit(2)
  }
}
step('relayer balance', `${(await balance(relayer.accountAddress)) / 1e8} APT`)

// 1. A sender pays a fresh one-time address (the transfer creates its account).
const r = receiver(chain)
const payment = S.createPayment(chain, r.meta, { memo: { name: 'Ada', note: 'Rent, live on Aptos' } })
step('one-time address', payment.stealthAddress)
const paid = await client.signAndSubmitTransaction({ signer: relayer, transaction: await transfer(relayer.accountAddress, payment.stealthAddress) })
await client.waitForTransaction({ transactionHash: paid.hash })
step('paid 0.1 APT', link(paid.hash))

// 2. The receiver finds it and opens the note.
const a = readAnnouncement(chain, announce(chain, payment, BigInt(AMOUNT)))
check('receiver finds it', S.findPayment(chain, r.view, a) === payment.stealthAddress)
check('receiver opens the sealed note', S.openPaymentMemo(chain, r.keys.viewingPrivateKey, a)?.note === 'Rent, live on Aptos')
const spendKey = S.paymentPrivateKey(chain, r.keys, a.ephemeralPublicKey)
const publicKey = new Ed25519PublicKey(chain.scheme.publicKey(spendKey))
check('Aptos SDK derives the same address', publicKey.authKey().derivedAddress().toString() === payment.stealthAddress)
check('the chain holds the amount', (await balance(payment.stealthAddress)) === AMOUNT)

// 3. Spend with a fee payer: the one-time address signs the transfer, the relayer pays the gas.
const home = Account.generate().accountAddress
const spend = await transfer(payment.stealthAddress, home, true)
spend.feePayerAddress = relayer.accountAddress
const bcs = new FeePayerRawTransaction(spend.rawTransaction, spend.secondarySignerAddresses ?? [], spend.feePayerAddress).bcsToBytes()
check('library signing message = SDK’s', Buffer.from(aptosSigningMessage(bcs)).equals(Buffer.from(generateSigningMessageForTransaction(spend))))
const senderAuthenticator = new AccountAuthenticatorEd25519(publicKey, new Ed25519Signature(signAptosTransaction(spendKey, bcs)))
const feePayerAuthenticator = client.transaction.signAsFeePayer({ signer: relayer, transaction: spend })
const sent = await client.transaction.submit.simple({ transaction: spend, senderAuthenticator, feePayerAuthenticator })
const done = await client.waitForTransaction({ transactionHash: sent.hash })
step('spent, relayer paid the gas', link(sent.hash))
check('the chain accepted both signatures', done.success === true)
check('the one-time address is empty', (await balance(payment.stealthAddress)) === 0)
check('the receiver’s own address got all 0.1 APT', (await balance(home)) === AMOUNT)
