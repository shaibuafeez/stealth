// Stellar testnet, for real: pay a one-time G… address with a claimable balance (it needs no account
// to receive), the ephemeral key in the memo; find it from the chain; then claim and spend in one
// transaction whose reserves and fee a relayer covers, so the one-time address never holds XLM.
import { randomBytes } from 'node:crypto'
import { Asset, BASE_FEE, Claimant, Horizon, Keypair, Memo, Networks, Operation, TransactionBuilder, xdr } from '@stellar/stellar-sdk'
import { signStellarTransaction, stellar, stellarTransactionHash } from '../dist/chains/stellar/index.js'
import { check, funderSecret, receiver, S, step } from './lib.mjs'

const server = new Horizon.Server('https://horizon-testnet.stellar.org')
const link = (hash) => `https://stellar.expert/explorer/testnet/tx/${hash}`
const friendbot = async (address) => {
  const res = await fetch(`https://friendbot.stellar.org?addr=${address}`)
  if (!res.ok && res.status !== 400) throw new Error(`friendbot ${res.status}`)
}
const balanceOf = async (address) => {
  try {
    return (await server.loadAccount(address)).balances.find((b) => b.asset_type === 'native').balance
  } catch {
    return null
  }
}

const relayer = Keypair.fromRawEd25519Seed(Buffer.from(funderSecret('stellar', () => randomBytes(32))))
console.log('Stellar testnet')
step('relayer (pays fees, reserves)', relayer.publicKey())
if ((await balanceOf(relayer.publicKey())) === null) await friendbot(relayer.publicKey())
const home = Keypair.random()
await friendbot(home.publicKey())
const homeBefore = Number(await balanceOf(home.publicKey()))

// 1. A sender pays a fresh one-time address with a claimable balance, and puts the ephemeral public
//    key (32 bytes) in the transaction's hash memo.
const r = receiver(stellar)
const payment = S.createPayment(stellar, r.meta)
step('one-time address', payment.stealthAddress)
const pay = new TransactionBuilder(await server.loadAccount(relayer.publicKey()), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.createClaimableBalance({ asset: Asset.native(), amount: '5', claimants: [new Claimant(payment.stealthAddress, Claimant.predicateUnconditional())] }))
  .addMemo(Memo.hash(Buffer.from(payment.ephemeralPublicKey)))
  .setTimeout(60)
  .build()
pay.sign(relayer)
const paid = await server.submitTransaction(pay)
step('paid 5 XLM (claimable)', link(paid.hash))

// 2. The receiver reads the payment back from the chain: the claimant, and the ephemeral key in the memo.
//    The memo holds 32 bytes, so there's no view tag: the receiver derives it from the shared secret.
const seen = await server.transactions().transaction(paid.hash).call()
const ephemeralPublicKey = new Uint8Array(Buffer.from(seen.memo, 'base64'))
const ops = await server.operations().forTransaction(paid.hash).call()
const claimant = ops.records[0].claimants[0].destination
const viewTag = stellar.scheme.hashedSecret(stellar.scheme.sharedPoint(r.view.viewingPrivateKey, ephemeralPublicKey))[0]
check('receiver finds it from the chain', S.findPayment(stellar, r.view, { ephemeralPublicKey, viewTag, stealthAddress: claimant }) === payment.stealthAddress)
check('the one-time address has no account yet', (await balanceOf(payment.stealthAddress)) === null)

// 3. Claim and spend in one transaction: the relayer sponsors the new account's reserves and pays the
//    fee; the one-time key signs the claim, the payment out, and the end of the sponsorship.
const balanceId = (await server.claimableBalances().claimant(payment.stealthAddress).call()).records[0].id
const spendKey = S.paymentPrivateKey(stellar, r.keys, ephemeralPublicKey)
const claim = new TransactionBuilder(await server.loadAccount(relayer.publicKey()), { fee: String(Number(BASE_FEE) * 5), networkPassphrase: Networks.TESTNET })
  .addOperation(Operation.beginSponsoringFutureReserves({ sponsoredId: payment.stealthAddress }))
  .addOperation(Operation.createAccount({ destination: payment.stealthAddress, startingBalance: '0' }))
  .addOperation(Operation.claimClaimableBalance({ balanceId, source: payment.stealthAddress }))
  .addOperation(Operation.payment({ destination: home.publicKey(), asset: Asset.native(), amount: '5', source: payment.stealthAddress }))
  .addOperation(Operation.endSponsoringFutureReserves({ source: payment.stealthAddress }))
  .setTimeout(60)
  .build()
const txXdr = new Uint8Array(claim.tx.toXDR())
check('library hash = SDK hash', Buffer.from(stellarTransactionHash(Networks.TESTNET, txXdr)).equals(claim.hash()))
const { hint, signature } = signStellarTransaction(spendKey, Networks.TESTNET, txXdr)
claim.addDecoratedSignature(new xdr.DecoratedSignature({ hint: Buffer.from(hint), signature: Buffer.from(signature) }))
claim.sign(relayer)
const claimed = await server.submitTransaction(claim)
step('claimed and spent', link(claimed.hash))
check('the one-time account holds 0 XLM', Number(await balanceOf(payment.stealthAddress)) === 0)
check('the receiver’s own account got all 5 XLM', Number(await balanceOf(home.publicKey())) - homeBefore === 5)
