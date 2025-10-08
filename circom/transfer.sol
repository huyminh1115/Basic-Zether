// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 690365547947261052114072781428907499366672006420806726632220606597136161243;
    uint256 constant alphay  = 6050953851535478557839677471428357681767984213403940569012011729721607456781;
    uint256 constant betax1  = 10872443184221910359337949881799938437735535794467948501140130212148005083022;
    uint256 constant betax2  = 7861200681754382423676763476942697328397907887606844083760049799953647744867;
    uint256 constant betay1  = 10950630238047147917408286041518394358659670769850662586146314160743802682559;
    uint256 constant betay2  = 2237495802999866506167374844987679605957600361282367001260732295479395028017;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 5461616477949288877352339649678458238857573096149685839862753106122065485994;
    uint256 constant deltax2 = 13908105317254982979600532035929751290935512116047127055237023278378206496818;
    uint256 constant deltay1 = 6258862397544340499656734079369275493883915747634038170576080763668297267018;
    uint256 constant deltay2 = 19665849730126068674089997150539664502687448054955893217366785830634882295211;

    
    uint256 constant IC0x = 60652427697150610898657708490005073365333608343061945157808720563818679289;
    uint256 constant IC0y = 7653061247613369615439379704366601550796900878719415157727292050750540389284;
    
    uint256 constant IC1x = 2276142011228441496036111944589252036915811063496247969724465610947259587019;
    uint256 constant IC1y = 20469066670689535746029317015408962451610487548416662494041361861953697230557;
    
    uint256 constant IC2x = 14170881738503618929814933668711155305064124639904204585940767907502373773586;
    uint256 constant IC2y = 20945617726284078135208484942500030904641082577299328934975298318953389378492;
    
    uint256 constant IC3x = 18870770008394266403613586536076577987770545437348642302966339021977806253809;
    uint256 constant IC3y = 16263030606001031936904125259738299736138311192834023450301860217436870875177;
    
    uint256 constant IC4x = 4952427268695251788510971380503085770801518138237361769038251696419856986751;
    uint256 constant IC4y = 12113577392049685987549438725152021915498526148112397375087630821763828438790;
    
    uint256 constant IC5x = 8870856349526660101112797270164718679145268429228784656227559922832479732734;
    uint256 constant IC5y = 1427240541428930638810183356137868777541725684848699120950971622923856602639;
    
    uint256 constant IC6x = 17227899721140512611495914612306696144880912064497840106325072383344370099699;
    uint256 constant IC6y = 1522891353952477830519770659489034977222578445185475975823669893403455024735;
    
    uint256 constant IC7x = 18975483516256982821027665795179628808258788445468297294179901903668122790955;
    uint256 constant IC7y = 20687268470954935333175200356974427037019760771025227542022129038127084159246;
    
    uint256 constant IC8x = 21032633153224167431666429808137469436334505202306228155401938093897616840545;
    uint256 constant IC8y = 16006739431086399602188502634423598771071563229484496067830612820954965822873;
    
    uint256 constant IC9x = 8402665306187194234255558142971534172592582224949478788892441400540313019310;
    uint256 constant IC9y = 10524638861508412805653157577299477158862545079159460034596545779912160062191;
    
    uint256 constant IC10x = 15374296701180543944585066990582002113086786488386087153548493481988331934993;
    uint256 constant IC10y = 14443007494411329759353694029533341956978871973524076111737665593552070092603;
    
    uint256 constant IC11x = 18032756137224250422400779737480432718350424596620240987426158922862909977233;
    uint256 constant IC11y = 15449379463006742660325137203737892799988873764606256086770279832842454179381;
    
    uint256 constant IC12x = 1681186384756245033064687708450104297231938227145129699543208617151057770470;
    uint256 constant IC12y = 15678314456428560025411475848396887057347434800310400785080018598950939496467;
    
    uint256 constant IC13x = 7228437966127624470560165337953120551702863540113923072525294093205168330457;
    uint256 constant IC13y = 16468247452436642748669990930235652970338303905868575826768611936032776727868;
    
    uint256 constant IC14x = 6571527173763765900550860492899198853768521595207984253780523832174977017874;
    uint256 constant IC14y = 8552946674671723180783984127502025782742333523027257497870612626747664141779;
    
    uint256 constant IC15x = 17640776185899470764423806062101306192155166893071373478296603412470810841393;
    uint256 constant IC15y = 18679620020989473901328077874095687147979282045674963875196811226011923246233;
    
    uint256 constant IC16x = 21532750327035562120740047166632583565420253988805417202214394261128550498351;
    uint256 constant IC16y = 14362986522552219744928470583585506612098621782918123206148180451615526001576;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[16] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                
                g1_mulAccC(_pVk, IC16x, IC16y, calldataload(add(pubSignals, 480)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            
            checkField(calldataload(add(_pubSignals, 480)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
