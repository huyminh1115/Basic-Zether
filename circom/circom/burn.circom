pragma circom 2.1.6;

// include "circomlib/poseidon.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/escalarmulany.circom";
include "circomlib/circuits/comparators.circom"; // for LessThan

// include "../../node_modules/circomlib/poseidon.circom";


template Burn(NBITS) {
    // ----- Public inputs -----
    signal input y[2];
    signal input CL[2];
    signal input CR[2];
    signal input b;                 // burn amount
    signal input cur_b;             // current balance
    signal input counter;           // not used in constraints

    // ----- Private witness -----
    signal input sk;

    // Y = [sk]G (variable-base mul)
    component check_pk = BabyPbk();
    check_pk.in <== sk;
    y[0] === check_pk.Ax;
    y[1] === check_pk.Ay;

    // Check b <= cur_b
    // dont need to check cur_b < MAX (since )
    component ltB  = LessThan(NBITS);
    ltB.in[0] <== b;
    ltB.in[1] <== cur_b + 1; // to do less than or equal
    ltB.out === 1;


    // Check CL, CR is on the curve
    component check_on_curve_CL = BabyCheck();
    check_on_curve_CL.x <== CL[0];
    check_on_curve_CL.y <== CL[1];

    component check_on_curve_CR = BabyCheck();
    check_on_curve_CR.x <== CR[0];
    check_on_curve_CR.y <== CR[1];

    // baby jubjub curve base point
    var base[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];

    component skBits = Num2Bits(NBITS);
    skBits.in <== sk;

    component cur_b_Bits = Num2Bits(NBITS);
    cur_b_Bits.in <== cur_b;


    // T1 = [sk]CR
    component mul_CR_sk = EscalarMulAny(NBITS);
    mul_CR_sk.p[0] <== CR[0];
    mul_CR_sk.p[1] <== CR[1];
    // T2 = [b]G
    component mul_g_cur_b = EscalarMulAny(NBITS);
    mul_g_cur_b.p[0] <== base[0];
    mul_g_cur_b.p[1] <== base[1];

    for (var i = 0; i < NBITS; i++) {
        mul_CR_sk.e[i] <== skBits.out[i];
        mul_g_cur_b.e[i] <== cur_b_Bits.out[i];
    }

    // Sum = T2 + T1 = [cur_b]G + [sk]CR = CL
    component add = BabyAdd();
    add.x1 <== mul_g_cur_b.out[0];
    add.y1 <== mul_g_cur_b.out[1];
    add.x2 <== mul_CR_sk.out[0];
    add.y2 <== mul_CR_sk.out[1];

    // Enforce CL == [cur_b]G + [sk]CR
    CL[0] === add.xout;
    CL[1] === add.yout;
}

// BabyJub subgroup has ~252-bit order; 253 bits is a safe upper bound.
component main{public [y, b, CL, CR, counter]} = Burn(252);