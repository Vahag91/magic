import { PanResponder, View, Text, Animated, StyleSheet, TextInput } from 'react-native';
import { useRef, useEffect } from 'react';
import { Icon} from './constants';

const CustomSlider = ({ value, onValueChange, min = 0, max = 100 }) => {
  const widthRef = useRef(0);

  // Refs to hold latest props to avoid stale closures in PanResponder
  const onValueChangeRef = useRef(onValueChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);
  useEffect(() => {
    minRef.current = min;
  }, [min]);
  useEffect(() => {
    maxRef.current = max;
  }, [max]);

  const calculateValue = touchX => {
    const width = widthRef.current;
    if (width <= 0) return;

    const _min = minRef.current;
    const _max = maxRef.current;

    let percentage = touchX / width;
    if (percentage < 0) percentage = 0;
    if (percentage > 1) percentage = 1;

    const newValue = _min + percentage * (_max - _min);
    onValueChangeRef.current(newValue);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false, // Prevent ScrollView from stealing

      onPanResponderGrant: evt => calculateValue(evt.nativeEvent.locationX),
      onPanResponderMove: evt => calculateValue(evt.nativeEvent.locationX),
    }),
  ).current;

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  return (
    <View
      style={{ height: 40, justifyContent: 'center', marginVertical: 5 }}
      onLayout={e => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View
        pointerEvents="none"
        style={{ height: 30, justifyContent: 'center' }}
      >
        <View
          style={{
            height: 6,
            backgroundColor: '#E5E7EB',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${percentage}%`,
            marginLeft: -12, // Center the 24px knob
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: 'white',
            borderWidth: 2,
            borderColor: '#3b82f6',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3,
          }}
        />
      </View>
      <View
        style={{ position: 'absolute', right: 0, top: -12 }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 10, color: '#999', fontWeight: 'bold' }}>
          {value.toFixed(0)}
        </Text>
      </View>
    </View>
  );
};

const DraggableTextItem = ({ layer, selectedId, onSelect, onUpdate }) => {
    const isSelected = selectedId === layer.id;
    const layerRef = useRef(layer);
    const startPosRef = useRef({ x: 0, y: 0 });

    useEffect(() => { layerRef.current = layer; }, [layer]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                onSelect(layer.id);
                startPosRef.current = { x: layerRef.current.x, y: layerRef.current.y };
            },
            onPanResponderMove: (evt, gestureState) => {
                const newX = startPosRef.current.x + gestureState.dx;
                const newY = startPosRef.current.y + gestureState.dy;
                onUpdate(layer.id, { x: newX, y: newY });
            },
        })
    ).current;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            // Larger hitSlop to make grabbing easier
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={{
                position: 'absolute',
                left: layer.x, 
                top: layer.y,
                transform: [{ translateX: -50 }, { translateY: -20 }],
                zIndex: isSelected ? 100 : 10,
                alignItems: 'center',
            }}
        >
             {isSelected && (
                <View style={styles.dragHandle}>
                    <Icon name="✋" size={14} color="white" />
                </View>
             )}

             <View style={[styles.textBoxContainer, isSelected && styles.textBoxSelected]}>
                <TextInput 
                    value={layer.text}
                    onChangeText={(txt) => onUpdate(layer.id, { text: txt })}
                    editable={isSelected}
                    multiline={false}
                    style={{
                        fontSize: layer.fontSize,
                        color: layer.color,
                        fontWeight: 'bold',
                        padding: 0,
                        margin: 0,
                        textShadowColor: 'rgba(0, 0, 0, 0.3)',
                        textShadowOffset: {width: 0, height: 1},
                        textShadowRadius: 2,
                    }}
                />
             </View>
        </Animated.View>
    );
};
const styles = StyleSheet.create({

});
export { CustomSlider };
