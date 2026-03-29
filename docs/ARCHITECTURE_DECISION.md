# Architektūros Sprendimas: KV-Based Time-Series History

## Problema
Standardinis SQL (`D1`) naudojimas istorinių duomenų saugojimui Armas Reforger Leaderboard projektui atsimuša į Cloudflare D1 nemokamus limitus:
- SQL Write limitas: 100,000 per dieną.
- Kiekvienas modas (iš ~3,000) reikalauja atskiro SQL įrašo kas valandą.
- 3,000 mods * 24h = 72,000 SQL writes per parą vien istorijai. Tai palieka labai mažai vietos kitiems atnaujinimams.

## Sprendimas: 100% KV-Native Architektūra (0 SQL)
Siekiant maksimalaus „Anti-Limit“ saugumo ir žaibiško greičio, projektas visiškai atsisakė SQL (`D1`) duomenų bazės:

1. **Visiškas SQL atsisakymas**: Į SQL (`D1`) nebebus nei rašoma, nei skaitoma. Visi operacijų limitai dabar lygūs 0, kas leidžia projektui augti neribotai be baimės užblokuoti duomenų bazę.
2. **KV Time-Series (History)**: Istoriniai duomenys pildomi kas valandą į „Master JSON“ paketus:
   - `history:hourly`: Paskutinės 24 valandos aukšta rezoliucija.
   - `history:daily`: Paskutinės 90 dienų (Saugus „Sliding Window“ langas).
3. **Agreguotas Trending API**: Vietoj SQL JOIN'ų, „Trending“ logika dabar lygina du JSON taškus tiesiai KV podėlyje, sutaupydama šimtus milisekundžių užkrovimo laiko.
4. **Resursų saugumas**: 25MB KV limito pakanka daugiau nei 120 dienų pilnai visų modų istorijai. Ateityje istorija bus skaidoma į ketvirčių (Q1, Q2) failus, jei prireiks metų vaizdo.

## Privalumai
- **Žaibiškas greitis**: KV podėlis yra Edge lygio – vartotojas gauna duomenis iš arčiausių serverių be SQL lėtumo.
- **Nulis „Writes“ klaidų**: Išvengta SQL „Database Locked“ problemų, būdingų D1 Beta stadijoje.
- **Neribotas augimas**: Modų skaičiaus didėjimas nebeveikia sistemos pajėgumo.

## Pakeitimo Svarba
Šis pasirinkimas buvo priimtas 2024-03-29, siekiant padaryti projektą „Serverless-native“ ir užtikrinti, kad Leaderboard'as veiktų sklandžiai be jokių priežiūros kaštų ar limitų viršijimo rizikos.
