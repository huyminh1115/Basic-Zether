snarkjs powersoftau new bn128 "$1" "$2".ptau -v
snarkjs powersoftau contribute "$2".ptau "$2"_1.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 "$2"_1.ptau "$2"_final.ptau -v
snarkjs groth16 setup $2.r1cs "$2"_final.ptau $2.zkey
snarkjs zkey contribute $2.zkey "$2"_1.zkey --name="1st Contributor Name" -v
snarkjs zkey export verificationkey "$2"_1.zkey "$2"_verification_key.json