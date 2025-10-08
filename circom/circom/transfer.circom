pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/escalarmulany.circom";
include "circomlib/circuits/comparators.circom"; // for LessThan

template ConfTransfer(NBITS) {
    // -------------------- Public inputs --------------------
    // Sender and receiver public keys
    signal input y[2];        // sender pubkey Y
    signal input yR[2];       // receiver pubkey Ȳ

    // Current balance ciphertext for Y
    signal input CL[2];
    signal input CR[2];

    // Fresh ciphertexts proving the transfer amount sAmount: (C_send, D_send) for Y, (C_receive, D_send) for Ȳ (use same D)
    signal input CS[2];       // C_send
    signal input D[2];        // D_send
    signal input CRe[2];      // C_receive
    signal input counter;     // not used in constraints

    // -------------------- Private witness --------------------
    signal input MAX;               // max value
    signal input sk;                // sender secret key
    signal input sAmount;           // send amount sAmount
    signal input bRem;             // remaining balance
    signal input r;                 // randomness

    // -------------------- Constants --------------------
    // BabyJub base point (same as in your snippet)
    var G[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];

    // -------------------- Sanity: points are on-curve --------------------
    component chkY  = BabyCheck();  chkY.x  <== y[0];           chkY.y  <== y[1];
    component chkYR = BabyCheck();  chkYR.x <== yR[0];          chkYR.y <== yR[1];

    component chkCL = BabyCheck();  chkCL.x <== CL[0];          chkCL.y <== CL[1];
    component chkCR = BabyCheck();  chkCR.x <== CR[0];          chkCR.y <== CR[1];

    component chkC  = BabyCheck();   chkC.x  <== CS[0];         chkC.y  <== CS[1];
    component chkD  = BabyCheck();   chkD.x  <== D[0];          chkD.y  <== D[1];
    component chkCRe = BabyCheck();  chkCRe.x <== CRe[0];       chkCRe.y <== CRe[1];

    // -------------------- Bits for scalars --------------------
    component skBits        = Num2Bits(NBITS);  skBits.in <== sk;
    component rBits         = Num2Bits(NBITS);  rBits.in  <== r;
    component sAmountBits   = Num2Bits(NBITS);  sAmountBits.in  <== sAmount;
    component bRemBits      = Num2Bits(NBITS);  bRemBits.in <== bRem;

    // bRem <= MAX meaning that it is also >= 0
    component lt_bRem = LessThan(NBITS);
    lt_bRem.in[0] <== bRem;
    lt_bRem.in[1] <== MAX+1;
    lt_bRem.out === 1;

    // -------------------- y = [sk]G --------------------
    component pk = BabyPbk();
    pk.in <== sk;
    y[0] === pk.Ax;
    y[1] === pk.Ay;

    // -------------------- Ciphertexts well-formed & same sAmount, r --------------------
    // [sAmount]G
    component mul_sAmount_G = EscalarMulAny(NBITS);
    mul_sAmount_G.p[0] <== G[0];
    mul_sAmount_G.p[1] <== G[1];

    // [r]G
    component mul_r_G = EscalarMulAny(NBITS);
    mul_r_G.p[0] <== G[0];
    mul_r_G.p[1] <== G[1];

    // [r]y
    component mul_r_y = EscalarMulAny(NBITS);
    mul_r_y.p[0] <== y[0];
    mul_r_y.p[1] <== y[1];

    // [r]ȳ
    component mul_r_yR = EscalarMulAny(NBITS);
    mul_r_yR.p[0] <== yR[0];
    mul_r_yR.p[1] <== yR[1];

    for (var i = 0; i < NBITS; i++) {
        mul_sAmount_G.e[i]  <== sAmountBits.out[i];
        mul_r_G.e[i]  <== rBits.out[i];
        mul_r_y.e[i]  <== rBits.out[i];
        mul_r_yR.e[i] <== rBits.out[i];
    }

    // CS = [sAmount]G + [r]y
    component ad_D_C = BabyAdd();
    ad_D_C.x1 <== mul_sAmount_G.out[0];
    ad_D_C.y1 <== mul_sAmount_G.out[1];
    ad_D_C.x2 <== mul_r_y.out[0];
    ad_D_C.y2 <== mul_r_y.out[1];

    // C_recieve = [sAmount]G + [r]ȳ
    component ad_D_CRe = BabyAdd();
    ad_D_CRe.x1 <== mul_sAmount_G.out[0];
    ad_D_CRe.y1 <== mul_sAmount_G.out[1];
    ad_D_CRe.x2 <== mul_r_yR.out[0];
    ad_D_CRe.y2 <== mul_r_yR.out[1];

    // Enforce equality with provided ciphertexts
    CS[0] === ad_D_C.xout;   CS[1] === ad_D_C.yout;
    CRe[0] === ad_D_CRe.xout; CRe[1] === ad_D_CRe.yout;
    D[0] === mul_r_G.out[0];  D[1] === mul_r_G.out[1];

    // -------------------- Balance consistency --------------------
    // Left side: CL - CS  (i.e., CL + (-CS))
    signal CS_neg_x;  CS_neg_x <== 0 - CS[0];
    component ad_D_CLmC = BabyAdd();
    ad_D_CLmC.x1 <== CL[0];
    ad_D_CLmC.y1 <== CL[1];
    ad_D_CLmC.x2 <== CS_neg_x;  // -CS.x
    ad_D_CLmC.y2 <== CS[1];    //  CS.y

    // Right side pieces:
    // [b']G
    component mul_bRem_G = EscalarMulAny(NBITS);
    mul_bRem_G.p[0] <== G[0];
    mul_bRem_G.p[1] <== G[1];

    //  (CR - D) = CR + (-D)
    signal Dneg_x;  Dneg_x <== 0 - D[0];
    component ad_D_CRmD = BabyAdd();
    ad_D_CRmD.x1 <== CR[0];
    ad_D_CRmD.y1 <== CR[1];
    ad_D_CRmD.x2 <== Dneg_x;  // -D.x
    ad_D_CRmD.y2 <== D[1];    //  D.y

    //  [sk](CR - D)
    component mul_sk_CRmD = EscalarMulAny(NBITS);
    mul_sk_CRmD.p[0] <== ad_D_CRmD.xout;
    mul_sk_CRmD.p[1] <== ad_D_CRmD.yout;

    for (var j = 0; j < NBITS; j++) {
        mul_bRem_G.e[j]    <== bRemBits.out[j];
        mul_sk_CRmD.e[j] <== skBits.out[j];
    }

    //  RHS = [b']G + [sk](CR - D)
    component ad_D_rhs = BabyAdd();
    ad_D_rhs.x1 <== mul_bRem_G.out[0];
    ad_D_rhs.y1 <== mul_bRem_G.out[1];
    ad_D_rhs.x2 <== mul_sk_CRmD.out[0];
    ad_D_rhs.y2 <== mul_sk_CRmD.out[1];

    // Enforce CL - CS == [b']G + [sk](CR - D)
    ad_D_CLmC.xout === ad_D_rhs.xout;
    ad_D_CLmC.yout === ad_D_rhs.yout;

}

// BabyJub subgroup ~252 bits;
component main{public [MAX, y, yR, CL, CR, CS, CRe, D, counter]} = ConfTransfer(252);

/* INPUT = {
    "MAX": "4294967295",
    "sk": "989684980841917356420192175194090137718385886803255486827734521826538409888",
    "y": [
        "21847968061825297417219090225605021230077606664375979689919232609498569628310",
        "19655704534932545550903049736104505487372785233094657404723345615117009132870"
    ],
    "yR": [
        "12856228529820987290477854508258732940909533731994892955617228766282444025226",
        "19429118719945817152055158515825218681941704075349405888554075279854669702972"
    ],
    "sAmount": 10000,
    "bRem": 0,
    "r": "933772925640813098472891403055305183981413135795810327728680046444571599689",
    "CL": [
        "1036941612827079980393668308278962655830955130962352953153620080008644592139",
        "16878626344745067585867872728290707085056028222638755914933647942719623196717"
    ],
    "CR": [
        "5299619240641551281634865583518297030282874472190772894086521144482721001553",
        "16950150798460657717958625567821834550301663161624707787222815936182638968203"
    ],
    "CS": [
        "2810966296881574257817486809008741238427895945226519935513631107913851420706",
        "13808691544068989513834797784143429715214208565905112273881761909580694379885"
    ],
    "D": [
        "21546821883191746379536432735593335192090588565256115808623152258263672858019",
        "4714061065557039528595920094157173654424959104902187540900215978735445966295"
    ],
    "CRe": [
        "16436528296148233307043999769215483315030217386736893060031532104881479482552",
        "17820354452015325340626121196001976549859939034348100451709812475747936089897"
    ],
    "counter": 1
} */