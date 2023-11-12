//
//
//
import { TJson } from '../TJson'


const dataA: TJson = {
    name: 'Davy Jones',
    job: 'captain'
}

const dataB: TJson = {
    name: 'Davy Jones',
    film: {
        title: 'Pirates',
        tome: 2
    }
}

const dataC: TJson[] = [
    {
        film: 'Pirates',
        job: 'captain'
    }, {
        film: 'Harry Potter the movie',
        job: 'wizard'
    }
]


test('TJson', () => {
    expect(dataA).toEqual({
        name: 'Davy Jones',
        job: 'captain'
    })
})

test('TJson nested', () => {
    expect(dataB).toEqual({
        name: 'Davy Jones',
        film: {
            title: 'Pirates',
            tome: 2
        }
    })
})


test('TJson[]', () => {
    expect(dataC).toEqual([
        {
            film: 'Pirates',
            job: 'captain'
        }, {
            film: 'Harry Potter the movie',
            job: 'wizard'
        }
    ])
})