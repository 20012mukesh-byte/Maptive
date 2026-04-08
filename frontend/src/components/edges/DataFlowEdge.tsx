import { memo, useId } from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export type DataFlowEdgeData = {
  active?: boolean;
  degraded?: boolean;
  healing?: boolean;
  bottleneck?: boolean;
  broken?: boolean;
  bandwidthMbps?: number;
};

function DataFlowEdgeInner(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    data,
  } = props;
  const edgeData = (data ?? {}) as DataFlowEdgeData;
  const active = edgeData.active !== false;
  const degraded = Boolean(edgeData.degraded);
  const healing = Boolean(edgeData.healing);
  const bottleneck = Boolean(edgeData.bottleneck);
  const broken = Boolean(edgeData.broken);
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const uid = useId().replace(/:/g, '');
  const filterId = `glow-${id}-${uid}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stroke = broken ? '#ff2d55' : healing ? '#0ea5e9' : bottleneck ? '#fdba74' : degraded ? '#fca5a5' : '#94a3b8';
  const packetFill = healing ? '#38bdf8' : bottleneck ? '#fdba74' : '#0ea5e9';

  return (
    <g className="data-flow-edge">
      <defs>
        <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: broken ? 3 : bottleneck ? 2.5 : healing ? 2.4 : 2,
          strokeDasharray: broken ? '2 10' : healing ? '10 8' : bottleneck ? '6 6' : degraded ? '8 6' : undefined,
          ...style,
        }}
      />
      {active && !degraded && !broken ? (
        <>
          <circle r={healing ? 4 : 3.5} fill={packetFill} opacity={0.95} filter={`url(#${filterId})`}>
            <animateMotion
              dur={bottleneck ? '4s' : healing ? '2.2s' : '2.6s'}
              repeatCount="indefinite"
              path={edgePath}
              calcMode="linear"
              rotate="auto"
            />
          </circle>
          <circle r={2.4} fill="#ffffff" opacity={healing ? 0.9 : 0.65} filter={`url(#${filterId})`}>
            <animateMotion
              dur={bottleneck ? '4s' : healing ? '2.2s' : '2.6s'}
              begin="-1.05s"
              repeatCount="indefinite"
              path={edgePath}
              calcMode="linear"
              rotate="auto"
            />
          </circle>
        </>
      ) : null}
    </g>
  );
}

export const DataFlowEdge = memo(DataFlowEdgeInner);
