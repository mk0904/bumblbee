import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MissionCards } from '../src/features/MissionCards.jsx';
afterEach(cleanup);
test('all saved plans remain in a two-column scrollable library without pagination', () => {
 render(<MissionCards missions={Array.from({length:7},(_,i)=>({id:`m-${i}`,name:`Route ${i+1}`,waypoints:[]}))} />);
 expect(screen.getAllByRole('heading',{level:3})).toHaveLength(7);
 expect(screen.queryByRole('button',{name:'Next missions page'})).toBeNull();
});

test('tile selection and overlaid edit/delete are independent actions', async () => {
 const user=userEvent.setup(),onSelect=vi.fn(),onEdit=vi.fn(),onArchive=vi.fn();
 const mission={id:'plan',name:'Inspection',waypoints:[],revision:1};
 render(<MissionCards missions={[mission]} onSelect={onSelect} onEdit={onEdit} onArchive={onArchive}/>);
 await user.click(screen.getByRole('button',{name:'Edit Inspection'}));
 expect(onEdit).toHaveBeenCalledWith(mission);expect(onSelect).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Archive Inspection'}));
 expect(onArchive).toHaveBeenCalledWith(mission);expect(onSelect).not.toHaveBeenCalled();
 await user.click(screen.getByRole('button',{name:'Select Inspection'}));
 expect(onSelect).toHaveBeenCalledWith(mission);
});
