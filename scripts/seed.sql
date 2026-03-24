-- Dummy data for Arma Reforger Mod Leaderboard
-- Run this to populate DB immediately without waiting for collector

-- Clear existing data
DELETE FROM ServerMod;
DELETE FROM Mod;
DELETE FROM Server;

-- Insert 30 popular mods (real mod IDs from test)
INSERT INTO Mod (id, modId, name, author, description, thumbnail, createdAt, updatedAt) VALUES
('1', '61ECB5EFAA346151', 'TacticalAnimationOverhaul', 'Community', 'Improved tactical animations', NULL, datetime('now'), datetime('now')),
('2', '6864C085DBF0E9D5', 'SimMovement - Headbob', 'Community', 'Realistic head movement simulation', NULL, datetime('now'), datetime('now')),
('3', '66475093193ABD26', 'SH-UHC-Movement', 'SpearHead', 'Ultra hardcore movement system', NULL, datetime('now'), datetime('now')),
('4', '68AE6B8DCA078FF1', 'SH-ScriptsCore', 'SpearHead', 'Core scripting framework', NULL, datetime('now'), datetime('now')),
('5', '65AD7D0D9941A380', 'ACE Core Dev', 'ACE Team', 'Advanced Combat Environment core', NULL, datetime('now'), datetime('now')),
('6', '6586079789278413', 'ACE Medical Core Dev', 'ACE Team', 'ACE medical system core', NULL, datetime('now'), datetime('now')),
('7', '65AD7D4F994EA327', 'ACE Medical Circulation Dev', 'ACE Team', 'Blood circulation system', NULL, datetime('now'), datetime('now')),
('8', '671F73D99978B4F2', 'ACE Medical Breathing Dev', 'ACE Team', 'Breathing mechanics', NULL, datetime('now'), datetime('now')),
('9', '65B343F799FB521B', 'ACE Medical Hitzones Dev', 'ACE Team', 'Advanced hit detection', NULL, datetime('now'), datetime('now')),
('10', '68D24B1F04D418B4', 'SH-ScriptFixes', 'SpearHead', 'Script fixes and improvements', NULL, datetime('now'), datetime('now')),
('11', '6739326907106051', 'SH-XP-Adjustments', 'SpearHead', 'XP system adjustments', NULL, datetime('now'), datetime('now')),
('12', '68B00B67AC6AA5B8', 'SH-GarbageCollector', 'SpearHead', 'Memory optimization', NULL, datetime('now'), datetime('now')),
('13', '687A303B1C62BABB', 'SH-FX-Tweaks', 'SpearHead', 'Visual effects tweaks', NULL, datetime('now'), datetime('now')),
('14', '687CD82F6E41D627', 'Attachment Framework-Core', 'Community', 'Weapon attachment framework', NULL, datetime('now'), datetime('now')),
('15', '645F08FA9E7CDEDE', 'Attachment Framework', 'Community', 'Weapon attachment system', NULL, datetime('now'), datetime('now')),
('16', '64722DADC53CB75E', 'NV-System', 'Community', 'Night vision system', NULL, datetime('now'), datetime('now')),
('17', '1337C0DE5DABBEEF', 'RHS - Content Pack 01', 'RHS', 'RHS content pack 1', NULL, datetime('now'), datetime('now')),
('18', 'BADC0DEDABBEDA5E', 'RHS - Content Pack 02', 'RHS', 'RHS content pack 2', NULL, datetime('now'), datetime('now')),
('19', '595F2BF2F44836FB', 'RHS - Status Quo', 'RHS', 'RHS mod main pack', NULL, datetime('now'), datetime('now')),
('20', '65AD7CF69FAF1FDD', 'ACE Compass Dev', 'ACE Team', 'Advanced compass system', NULL, datetime('now'), datetime('now')),
('21', '65AD7BCC9F6B3B4E', 'ACE Chopping Dev', 'ACE Team', 'Tree chopping mechanics', NULL, datetime('now'), datetime('now')),
('22', '65AD7D1E9EEAFA53', 'ACE Explosives Dev', 'ACE Team', 'Explosives system', NULL, datetime('now'), datetime('now')),
('23', '65AD7D4099944EBD', 'ACE Magazine Repack Dev', 'ACE Team', 'Magazine repacking', NULL, datetime('now'), datetime('now')),
('24', '65AD7C379CBD394D', 'ACE Carrying Dev', 'ACE Team', 'Carry heavy objects', NULL, datetime('now'), datetime('now')),
('25', '667B230F9505C8BA', 'ACE Weather Dev', 'ACE Team', 'Weather effects', NULL, datetime('now'), datetime('now')),
('26', '65AD7C139EB4C1A1', 'ACE Backblast Dev', 'ACE Team', 'Backblast simulation', NULL, datetime('now'), datetime('now')),
('27', '5E92F5A4A1B75A75', 'Player Map Markers', 'Community', 'See player markers on map', NULL, datetime('now'), datetime('now')),
('28', '62FCEB51DF8527B6', 'Improved Blood Effect', 'Community', 'Realistic blood effects', NULL, datetime('now'), datetime('now')),
('29', '660896EB172D4B7F', 'Improved Blood Effect Deluxe', 'Community', 'Enhanced blood effects', NULL, datetime('now'), datetime('now')),
('30', '64900A5A31F5DCB5', 'MRZR', 'Community', 'MRZR vehicle', NULL, datetime('now'), datetime('now'));

-- Insert 50 sample servers with realistic player counts
INSERT INTO Server (id, name, ip, port, players, maxPlayers, updatedAt) VALUES
('s1', '[NA3] SpearHead Bakhmut Ultra Hardcore', '192.168.1.1', 2001, 127, 128, datetime('now')),
('s2', '[EU1] Tactical Realism MilSim', '192.168.1.2', 2001, 64, 80, datetime('now')),
('s3', '[NA1] Public Conflict Server', '192.168.1.3', 2001, 45, 60, datetime('now')),
('s4', '[EU2] Roleplay Community', '192.168.1.4', 2001, 32, 40, datetime('now')),
('s5', '[NA2] Wasteland Survival', '192.168.1.5', 2001, 28, 50, datetime('now')),
('s6', '[EU3] PvP Arena', '192.168.1.6', 2001, 24, 32, datetime('now')),
('s7', '[NA4] Coop Missions', '192.168.1.7', 2001, 18, 20, datetime('now')),
('s8', '[EU4] Scenario Editor Playground', '192.168.1.8', 2001, 12, 16, datetime('now')),
('s9', '[NA5] MilSim Unit Training', '192.168.1.9', 2001, 10, 15, datetime('now')),
('s10', '[EU5] Vehicle Showcase', '192.168.1.10', 2001, 8, 12, datetime('now')),
('s11', 's11', '192.168.1.11', 2001, 76, 80, datetime('now')),
('s12', 's12', '192.168.1.12', 2001, 55, 64, datetime('now')),
('s13', 's13', '192.168.1.13', 2001, 42, 50, datetime('now')),
('s14', 's14', '192.168.1.14', 2001, 38, 45, datetime('now')),
('s15', 's15', '192.168.1.15', 2001, 30, 40, datetime('now')),
('s16', 's16', '192.168.1.16', 2001, 25, 32, datetime('now')),
('s17', 's17', '192.168.1.17', 2001, 20, 24, datetime('now')),
('s18', 's18', '192.168.1.18', 2001, 15, 20, datetime('now')),
('s19', 's19', '192.168.1.19', 2001, 12, 16, datetime('now')),
('s20', 's20', '192.168.1.20', 2001, 10, 12, datetime('now')),
('s21', 's21', '192.168.1.21', 2001, 95, 100, datetime('now')),
('s22', 's22', '192.168.1.22', 2001, 68, 75, datetime('now')),
('s23', 's23', '192.168.1.23', 2001, 48, 60, datetime('now')),
('s24', 's24', '192.168.1.24', 2001, 35, 40, datetime('now')),
('s25', 's25', '192.168.1.25', 2001, 28, 35, datetime('now')),
('s26', 's26', '192.168.1.26', 2001, 22, 30, datetime('now')),
('s27', 's27', '192.168.1.27', 2001, 18, 25, datetime('now')),
('s28', 's28', '192.168.1.28', 2001, 14, 20, datetime('now')),
('s29', 's29', '192.168.1.29', 2001, 10, 15, datetime('now')),
('s30', 's30', '192.168.1.30', 2001, 8, 12, datetime('now')),
('s31', 's31', '192.168.1.31', 2001, 82, 90, datetime('now')),
('s32', 's32', '192.168.1.32', 2001, 58, 65, datetime('now')),
('s33', 's33', '192.168.1.33', 2001, 44, 50, datetime('now')),
('s34', 's34', '192.168.1.34', 2001, 32, 40, datetime('now')),
('s35', 's35', '192.168.1.35', 2001, 26, 32, datetime('now')),
('s36', 's36', '192.168.1.36', 2001, 20, 25, datetime('now')),
('s37', 's37', '192.168.1.37', 2001, 16, 20, datetime('now')),
('s38', 's38', '192.168.1.38', 2001, 12, 16, datetime('now')),
('s39', 's39', '192.168.1.39', 2001, 9, 12, datetime('now')),
('s40', 's40', '192.168.1.40', 2001, 6, 10, datetime('now')),
('s41', 's41', '192.168.1.41', 2001, 72, 80, datetime('now')),
('s42', 's42', '192.168.1.42', 2001, 52, 60, datetime('now')),
('s43', 's43', '192.168.1.43', 2001, 38, 45, datetime('now')),
('s44', 's44', '192.168.1.44', 2001, 28, 35, datetime('now')),
('s45', 's45', '192.168.1.45', 2001, 22, 28, datetime('now')),
('s46', 's46', '192.168.1.46', 2001, 16, 22, datetime('now')),
('s47', 's47', '192.168.1.47', 2001, 12, 16, datetime('now')),
('s48', 's48', '192.168.1.48', 2001, 8, 12, datetime('now')),
('s49', 's49', '192.168.1.49', 2001, 5, 10, datetime('now')),
('s50', 's50', '192.168.1.50', 2001, 3, 8, datetime('now'));

-- Insert server-mod relationships (some servers have many mods, some few)
-- SpearHead server (s1) - lots of mods
INSERT INTO ServerMod (serverId, modId) VALUES
('s1', '1'), ('s1', '2'), ('s1', '3'), ('s1', '4'), ('s1', '5'),
('s1', '6'), ('s1', '7'), ('s1', '8'), ('s1', '9'), ('s1', '10'),
('s1', '11'), ('s1', '12'), ('s1', '13'), ('s1', '14'), ('s1', '15'),
('s1', '16'), ('s1', '17'), ('s1', '18'), ('s1', '19'), ('s1', '20'),
('s1', '21'), ('s1', '22'), ('s1', '23'), ('s1', '24'), ('s1', '25'),
('s1', '26'), ('s1', '27'), ('s1', '28'), ('s1', '29'), ('s1', '30');

-- ACE servers (s2-s6) - use ACE mods
INSERT INTO ServerMod (serverId, modId) VALUES
('s2', '5'), ('s2', '6'), ('s2', '7'), ('s2', '8'), ('s2', '9'),
('s2', '20'), ('s2', '21'), ('s2', '22'), ('s2', '23'), ('s2', '24'),
('s2', '25'), ('s2', '26'), ('s2', '27'), ('s2', '28'),
('s3', '5'), ('s3', '6'), ('s3', '7'), ('s3', '8'), ('s3', '9'),
('s3', '20'), ('s3', '21'), ('s3', '22'), ('s3', '23'),
('s4', '5'), ('s4', '6'), ('s4', '7'), ('s4', '8'), ('s4', '9'),
('s4', '20'), ('s4', '21'), ('s4', '22'),
('s5', '5'), ('s5', '6'), ('s5', '7'), ('s5', '8'), ('s5', '9'),
('s5', '20'), ('s5', '21'),
('s6', '5'), ('s6', '6'), ('s6', '7'), ('s6', '8'), ('s6', '9');

-- RHS servers (s7-s10) - use RHS mods
INSERT INTO ServerMod (serverId, modId) VALUES
('s7', '17'), ('s7', '18'), ('s7', '19'), ('s7', '14'), ('s7', '15'),
('s8', '17'), ('s8', '18'), ('s8', '19'), ('s8', '14'),
('s9', '17'), ('s9', '18'), ('s9', '19'),
('s10', '17'), ('s10', '18');

-- Mixed servers - various combinations
INSERT INTO ServerMod (serverId, modId) VALUES
('s11', '1'), ('s11', '2'), ('s11', '3'), ('s11', '5'), ('s11', '6'),
('s12', '1'), ('s12', '2'), ('s12', '5'), ('s12', '6'), ('s12', '7'),
('s13', '1'), ('s13', '5'), ('s13', '6'), ('s13', '7'), ('s13', '8'),
('s14', '1'), ('s14', '5'), ('s14', '6'), ('s14', '7'),
('s15', '1'), ('s15', '5'), ('s15', '6'),
('s16', '2'), ('s16', '3'), ('s16', '4'), ('s16', '5'),
('s17', '2'), ('s17', '3'), ('s17', '4'),
('s18', '2'), ('s18', '3'),
('s19', '2'), ('s19', '3'),
('s20', '3'), ('s20', '4'),
('s21', '1'), ('s21', '2'), ('s21', '5'), ('s21', '6'), ('s21', '7'), ('s21', '8'),
('s22', '1'), ('s22', '2'), ('s22', '5'), ('s22', '6'), ('s22', '7'),
('s23', '1'), ('s23', '2'), ('s23', '5'), ('s23', '6'),
('s24', '1'), ('s24', '2'), ('s24', '5'),
('s25', '1'), ('s25', '2'),
('s26', '3'), ('s26', '4'), ('s26', '5'),
('s27', '3'), ('s27', '4'),
('s28', '4'), ('s28', '5'),
('s29', '4'), ('s29', '5'),
('s30', '5'), ('s30', '6'),
('s31', '1'), ('s31', '5'), ('s31', '6'), ('s31', '7'), ('s31', '8'),
('s32', '1'), ('s32', '5'), ('s32', '6'), ('s32', '7'),
('s33', '1'), ('s33', '5'), ('s33', '6'),
('s34', '1'), ('s34', '5'),
('s35', '1'), ('s35', '5'),
('s36', '2'), ('s36', '3'), ('s36', '5'),
('s37', '2'), ('s37', '3'),
('s38', '2'), ('s38', '5'),
('s39', '2'), ('s39', '5'),
('s40', '5'), ('s40', '6'),
('s41', '1'), ('s41', '2'), ('s41', '5'), ('s41', '6'),
('s42', '1'), ('s42', '2'), ('s42', '5'),
('s43', '1'), ('s43', '2'),
('s44', '1'), ('s44', '5'),
('s45', '2'), ('s45', '3'),
('s46', '2'), ('s46', '3'),
('s47', '3'), ('s47', '4'),
('s48', '3'), ('s48', '4'),
('s49', '4'), ('s49', '5'),
('s50', '5'), ('s50', '6');

-- Verify data
SELECT 'Mods:' as count, COUNT(*) as value FROM Mod
UNION ALL
SELECT 'Servers:', COUNT(*) FROM Server
UNION ALL
SELECT 'ServerMods:', COUNT(*) FROM ServerMod;
