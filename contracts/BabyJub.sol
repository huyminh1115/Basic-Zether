// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// BabyJub over BN254 scalar field (Fr)
// Curve: a*x^2 + y^2 = 1 + d*x^2*y^2, with a=168700, d=168696 (mod P)

library BabyJub {
    // Field modulus P = BN254 scalar field (a.k.a. SNARK_SCALAR_FIELD)
    uint256 internal constant P =
        0x30644E72E131A029B85045B68181585D2833E84879B9709143E1F593F0000001;

    uint256 internal constant SUBGROUP_ORDER = 0x60C89CE5C263405370A08B6D0302B0BAB3EEDB83920EE0A677297DC392126F1;

    // BabyJub parameters
    uint256 internal constant A = 168700;
    uint256 internal constant D = 168696;

    // Neutral element (identity) in affine
    // For twisted Edwards: (0, 1) is the identity.
    struct Point {
        uint256 x;
        uint256 y;
    }

    // -------- Field ops (mod P) --------

    function addF(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 z = x + y;
        if (z >= P) z -= P;
        return z;
    }

    function subF(uint256 x, uint256 y) internal pure returns (uint256) {
        return x >= y ? x - y : P - (y - x);
    }

    function mulF(uint256 x, uint256 y) internal pure returns (uint256) {
        return mulmod(x, y, P);
    }

    function negF(uint256 x) internal pure returns (uint256) {
        return x == 0 ? 0 : P - x;
    }

    function modF(uint256 x) internal pure returns (uint256) {
        return x % P;
    }

    function expF(uint256 base, uint256 exponent) internal view returns (uint256 output) {
        // ModExp precompile (0x05)
        assembly {
            let m := mload(0x40)
            mstore(m, 0x20)            // len(base)
            mstore(add(m, 0x20), 0x20) // len(exp)
            mstore(add(m, 0x40), 0x20) // len(mod)
            mstore(add(m, 0x60), base)
            mstore(add(m, 0x80), exponent)
            mstore(add(m, 0xa0), P)
            if iszero(staticcall(gas(), 0x05, m, 0xc0, m, 0x20)) {
                revert(0, 0)
            }
            output := mload(m)
        }
    }

    function invF(uint256 x) internal view returns (uint256) {
        require(x != 0, "inv zero");
        // P ≡ 3 (mod 4), so inverse = x^(P-2) mod P
        return expF(x, P - 2);
    }

    function sqrtF(uint256 u) internal view returns (uint256 r, bool ok) {
        // Since P ≡ 3 mod 4, sqrt(u) = u^((P+1)/4) when quadratic residue
        r = expF(u, (P + 1) >> 2);
        ok = mulF(r, r) == u;
    }

    // -------- Curve utilities --------

    function isOnCurve(Point memory p) internal pure returns (bool) {
        if (p.x >= P || p.y >= P) return false;
        // a*x^2 + y^2 ?= 1 + d*x^2*y^2
        uint256 x2 = mulmod(p.x, p.x, P);
        uint256 y2 = mulmod(p.y, p.y, P);
        uint256 lhs = addF(mulF(A, x2), y2);
        uint256 rhs = addF(uint256(1), mulF(D, mulF(x2, y2)));
        return lhs == rhs;
    }

    function eq(Point memory p1, Point memory p2) internal pure returns (bool) {
        return p1.x == p2.x && p1.y == p2.y;
    }

    function id() internal pure returns (Point memory) {
        return Point(0, 1);
    }

    function base() internal pure returns (Point memory) {
        // Standard BabyJub generator (prime-order subgroup)
        return Point(
            5299619240641551281634865583518297030282874472190772894086521144482721001553,
            16950150798460657717958625567821834550301663161624707787222815936182638968203
        );
    }

    function neg(Point memory p) internal pure returns (Point memory) {
        // For twisted Edwards, -(x,y) = (-x, y)
        return Point(negF(p.x), p.y);
    }

    // -------- Group law (affine) --------
    // Add P + Q using Edwards formulas:
    //   t = d*x1*x2*y1*y2
    //   x3 = (x1*y2 + y1*x2) / (1 + t)
    //   y3 = (y1*y2 - a*x1*x2) / (1 - t)
    function add(Point memory p, Point memory q) internal view returns (Point memory r) {
        // Special cases with identity
        if (p.x == 0 && p.y == 1) return q;
        if (q.x == 0 && q.y == 1) return p;

        uint256 x1x2 = mulF(p.x, q.x);
        uint256 y1y2 = mulF(p.y, q.y);
        uint256 x1y2 = mulF(p.x, q.y);
        uint256 y1x2 = mulF(p.y, q.x);

        uint256 t = mulF(D, mulF(x1x2, y1y2));

        uint256 numX = addF(x1y2, y1x2);
        uint256 denX = addF(1, t);
        uint256 numY = subF(y1y2, mulF(A, x1x2));
        uint256 denY = subF(1, t);

        // Invert denominators
        uint256 invDenX = invF(denX);
        uint256 invDenY = invF(denY);

        r.x = mulF(numX, invDenX);
        r.y = mulF(numY, invDenY);
    }

    function double(Point memory p) internal view returns (Point memory) {
        // Use generic add for clarity (can be optimized)
        return add(p, p);
    }

    function mul(Point memory p, uint256 s) internal view returns (Point memory r) {
        // Double-and-add, starting from identity
        r = id();
        Point memory acc = p;
        while (s != 0) {
            if (s & 1 == 1) {
                r = add(r, acc);
            }
            acc = double(acc);
            s >>= 1;
        }
    }

}
